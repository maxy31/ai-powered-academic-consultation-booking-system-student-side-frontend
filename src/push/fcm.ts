import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../notifications/navigationRef';
import { NotificationItem } from '../notifications/types';
import { getCurrentFcmToken, initMessaging } from '../notifications/messagingSetup';
import { externalAddNotification } from '../notifications/NotificationContext';

// Dedupe set for showing local notifications
const deliveredIds = new Set<string>();
const BACKEND_BASE = 'http://10.0.2.2:8080';

async function postDeviceToken(token: string) {
  try {
    const jwt = await AsyncStorage.getItem('jwtToken');
    if (!jwt) return;
    const last = await AsyncStorage.getItem('fcmToken');
    if (last === token) {
      return; // no change
    }
    const res = await fetch(`${BACKEND_BASE}/api/notifications/register-device`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: 'ANDROID' })
    });
    if (res.ok) await AsyncStorage.setItem('fcmToken', token);
  } catch (e) {
    console.warn('[FCM] register device error', e);
  }
}

export async function initPushAfterLogin() {
  if (pushInitGuard()) return; // prevent duplicate
  // Ensure messaging base init (channel + permission) done
  await initMessaging();
  const token = await getCurrentFcmToken();
  if (token) await postDeviceToken(token);
  messaging().onTokenRefresh(t => postDeviceToken(t));
  setupForegroundHandlers();
  setupNotifeeClickHandlers();
}

let _pushInited = false;
function pushInitGuard() {
  if (_pushInited) return true;
  _pushInited = true;
  return false;
}

function setupForegroundHandlers() {
  messaging().onMessage(async rm => {
    console.log('[FCM] foreground message', rm.messageId, rm.data);
    handleRemoteMessage(rm, true);
  });
}

function setupNotifeeClickHandlers() {
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) routeByData(detail.notification?.data);
  });
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) routeByData(detail.notification?.data);
  });
}

function routeByData(data: any) {
  if (!data) return;
  if (data.relatedAppointmentId) {
    if (navigationRef.isReady()) {
      // @ts-ignore simplified navigation typing
      navigationRef.navigate('AppointmentDetail', { id: data.relatedAppointmentId });
    }
    return;
  }
  // fallback
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.navigate('Notifications');
  }
}

function asStr(v: any, fallback = ''): string { return typeof v === 'string' ? v : fallback; }
function remoteToLocalNotification(rm: FirebaseMessagingTypes.RemoteMessage): { id: string; title: string; body: string; data: any } {
  const id = asStr(rm.data?.id, rm.messageId) || String(Date.now());
  const title = asStr(rm.notification?.title) || asStr(rm.data?.title) || 'Notification';
  const body = asStr(rm.notification?.body) || asStr(rm.data?.body) || asStr(rm.data?.message) || '';
  return { id, title, body, data: rm.data };
}

async function showLocalFromRemote(rm: FirebaseMessagingTypes.RemoteMessage) {
  const n = remoteToLocalNotification(rm);
  if (deliveredIds.has(n.id)) return;
  deliveredIds.add(n.id);
  await notifee.createChannel({ id: 'general', name: 'General', importance: AndroidImportance.HIGH });
  await notifee.displayNotification({
    id: n.id,
    title: n.title,
    body: n.body,
    android: { channelId: 'general', pressAction: { id: 'default' } },
    data: n.data
  });
}

function buildNotificationItemFromRemote(rm: FirebaseMessagingTypes.RemoteMessage): NotificationItem | null {
  try {
    const idNum = Number(rm.data?.id);
    if (!idNum) return null;
    return {
      id: idNum,
      recipientUserId: Number((rm.data as any)?.recipientUserId) || 0,
      type: asStr((rm.data as any)?.type, 'SYSTEM') || 'SYSTEM',
      title: asStr((rm.data as any)?.title) || asStr(rm.notification?.title) || 'Notification',
      message: asStr((rm.data as any)?.body) || asStr(rm.notification?.body) || asStr((rm.data as any)?.message) || '',
      relatedAppointmentId: (rm.data as any)?.relatedAppointmentId ? Number((rm.data as any).relatedAppointmentId) : undefined,
      createdAt: asStr((rm.data as any)?.createdAt) || new Date().toISOString(),
      readAt: undefined,
    };
  } catch { return null; }
}

async function handleRemoteMessage(rm: FirebaseMessagingTypes.RemoteMessage, isForeground: boolean) {
  // Always display local (foreground) or rely on system (background) but we still may create one for uniformity
  if (isForeground) await showLocalFromRemote(rm);
  const item = buildNotificationItemFromRemote(rm);
  if (item) {
    console.log('[FCM] injecting into context id=', item.id);
    try { externalAddNotification(item); } catch (e) { console.warn('[FCM] inject error', e); }
  }
}

// Background handler for data-only to still generate local if system doesn't
messaging().setBackgroundMessageHandler(async rm => {
  console.log('[FCM] background message', rm.messageId, rm.data);
  await showLocalFromRemote(rm);
  const item = buildNotificationItemFromRemote(rm);
  if (item) try { externalAddNotification(item); } catch {}
});
