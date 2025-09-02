import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NotificationItem } from './types';
import { fetchNotifications, fetchUnreadCount, markRead } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let notifee: any = null; // lazy import (will resolve to module default)

// External injection point so non-React FCM handlers can push into context
export let externalAddNotification: (n: NotificationItem) => void = () => {};

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'fallback-sse' | 'polling';

interface Ctx {
  notifications: NotificationItem[];
  unreadCount: number;
  connectionStatus: ConnectionStatus;
  refresh: () => void;
  loadMore: () => void;
  markOneReadLocal: (id: number) => void;
  reconnect: () => void;
  addOrUpdateExternal: (n: NotificationItem) => void;
}

const NotificationsContext = createContext<Ctx | null>(null);

const PAGE_SIZE = 20;

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const clientRef = useRef<any | null>(null);
  const lastMessageAtRef = useRef<number>(0);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayedIdsRef = useRef<Set<number>>(new Set()); // track which notifications already displayed locally

  const addOrUpdate = useCallback((n: NotificationItem) => {
    setNotifications(prev => {
      const idx = prev.findIndex(p => p.id === n.id);
      let next: NotificationItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], ...n };
      } else {
        next = [n, ...prev];
      }
      next = next.sort((a,b)=> b.id - a.id); // newest first assuming incremental ids
      return next;
    });
    lastMessageAtRef.current = Date.now();
    if (!n.readAt) setUnreadCount(c => c + 1);
    displayLocal(n);
  }, []);

  // Keep external reference updated
  useEffect(() => { externalAddNotification = addOrUpdate; }, [addOrUpdate]);

  const displayLocal = async (n: NotificationItem) => {
    try {
      if (displayedIdsRef.current.has(n.id)) return; // already shown (avoid FCM + WS duplicate)
      if (!notifee) {
        const mod = require('@notifee/react-native');
        notifee = mod.default || mod; // support CommonJS / ESM shapes
        console.log('[Notifications] notifee module loaded keys:', Object.keys(notifee || {}));
      }
      if (!notifee?.requestPermission) {
        console.warn('[Notifications] notifee not properly loaded, skip');
        return;
      }
      const perm = await notifee.requestPermission();
      console.log('[Notifications] permission result:', perm);
      // Android channel (HIGH importance for heads-up) - smallIcon optional but helps reliability
      const AndroidImportance = notifee.AndroidImportance || { HIGH: 4 };
      await notifee.createChannel({ id: 'general', name: 'General', importance: AndroidImportance.HIGH });
      await notifee.displayNotification({
        title: n.title || 'Notification',
        body: n.message,
        data: { notificationId: String(n.id), relatedAppointmentId: String(n.relatedAppointmentId ?? '') },
        android: {
          channelId: 'general',
          smallIcon: 'ic_launcher', // default app icon
          pressAction: { id: 'default' },
          importance: AndroidImportance.HIGH,
        },
      });
      console.log('[Notifications] displayed local notification id', n.id);
  displayedIdsRef.current.add(n.id);
    } catch (e:any) {
      console.warn('[Notifications] displayLocal error', e?.message || e);
    }
  };

  const initFetch = useCallback(async () => {
    try {
  const [listRaw, unread] = await Promise.all([
        fetchNotifications(0, PAGE_SIZE, false),
        fetchUnreadCount()
      ]);
      const list = Array.isArray(listRaw) ? listRaw : [];
      setNotifications(list);
      setUnreadCount(typeof unread === 'number' ? unread : 0);
      setPage(0);
      setHasMore(list.length === PAGE_SIZE);
  // Seed displayedIds so we don't spam old historical notifications
  displayedIdsRef.current = new Set(list.map(l => l.id));
    } catch (e) {
      // swallow; keep previous state
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    try {
      const nextPage = page + 1;
      const list = await fetchNotifications(nextPage, PAGE_SIZE, false);
      setNotifications(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const safeList = Array.isArray(list) ? list : [];
        const map = new Map<number, NotificationItem>();
        [...safePrev, ...safeList].forEach(i => { if (i && typeof i.id === 'number') map.set(i.id, i); });
        return Array.from(map.values()).sort((a,b)=> b.id - a.id);
      });
      setPage(nextPage);
      if (list.length < PAGE_SIZE) setHasMore(false);
    } catch {}
  }, [page, hasMore]);

  const refresh = useCallback(() => { initFetch(); }, [initFetch]);

  const markOneReadLocal = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    markRead(id).catch(()=>{});
  }, []);

  // WebSocket (STOMP)
  const connectStomp = useCallback(async () => {
    const token = await AsyncStorage.getItem('jwtToken');
    if (!token) return;
    setConnectionStatus('connecting');
    const client = new Client({
      webSocketFactory: () => new SockJS('http://10.0.2.2:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {},
      reconnectDelay: 5000,
      onConnect: () => {
        setConnectionStatus('connected');
  client.subscribe('/user/queue/notifications', (msg: any) => {
          try { const payload: NotificationItem = JSON.parse(msg.body); addOrUpdate(payload); } catch {}
        });
      },
      onStompError: () => {
        setConnectionStatus('error');
      },
      onWebSocketClose: () => {
        setConnectionStatus('error');
      }
    });
    client.activate();
    clientRef.current = client;
  }, [addOrUpdate]);

  // Polling fallback when no messages / disconnected
  useEffect(() => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = setInterval(() => {
      const now = Date.now();
      const noRecentMessages = now - lastMessageAtRef.current > 30000; // 30s
      if (connectionStatus !== 'connected' || noRecentMessages) {
        fetchUnreadCount().then(c => setUnreadCount(c)).catch(()=>{});
        fetchNotifications(0, PAGE_SIZE, false).then(list => {
          setNotifications(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const safeList = Array.isArray(list) ? list : [];
            const map = new Map<number, NotificationItem>();
            [...safeList, ...safePrev].forEach(i => { if (i && typeof i.id === 'number') map.set(i.id, i); });
            const merged = Array.from(map.values()).sort((a,b)=> b.id - a.id);
            // For any ids in merged not previously seen, display local (new since last poll)
            merged.forEach(m => { if (!displayedIdsRef.current.has(m.id)) displayLocal(m); });
            return merged;
          });
        }).catch(()=>{});
      }
    }, 45000); // 45s
    return () => { if (pollingTimerRef.current) clearInterval(pollingTimerRef.current); };
  }, [connectionStatus]);

  // AppState foreground refresh
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => { initFetch(); connectStomp(); }, [initFetch, connectStomp]);

  // Proactively request notification permission & create channel once on mount
  useEffect(() => {
    (async () => {
      try {
        if (!notifee) {
          const mod = require('@notifee/react-native');
          notifee = mod.default || mod;
        }
        if (notifee?.requestPermission) {
          await notifee.requestPermission();
          const AndroidImportance = notifee.AndroidImportance || { HIGH: 4 };
            await notifee.createChannel({ id: 'general', name: 'General', importance: AndroidImportance.HIGH });
        }
      } catch (e) {
        console.warn('[Notifications] initial permission/channel setup failed');
      }
    })();
  }, []);

  const reconnect = () => { if (clientRef.current) clientRef.current.deactivate(); connectStomp(); };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, connectionStatus, refresh, loadMore, markOneReadLocal, reconnect, addOrUpdateExternal: addOrUpdate }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
};
