import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationItem } from './types';

const BASE = 'http://10.0.2.2:8080/api/notifications';

async function authHeaders() {
  const token = await AsyncStorage.getItem('jwtToken');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchNotifications(page = 0, size = 20, unreadOnly = false): Promise<NotificationItem[]> {
  const h = await authHeaders();
  const url = `${BASE}?unreadOnly=${unreadOnly}&page=${page}&size=${size}`;
  const res = await fetch(url, { headers: h });
  if (!res.ok) throw new Error('fetchNotifications failed');
  const raw = await res.json();
  // 后端可能返回: 纯数组 / {content: [...]} / {records: [...]} / {notificationList: [...]} / 分页对象
  let list: any = raw;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.content)) {
    list = raw.content;
  } else if (Array.isArray(raw?.records)) {
    list = raw.records;
  } else if (Array.isArray(raw?.notificationList)) {
    list = raw.notificationList;
  } else if (Array.isArray(raw?.data)) {
    list = raw.data;
  } else {
    list = [];
  }
  // 过滤非法元素
  return (list as any[]).filter(Boolean) as NotificationItem[];
}

export async function fetchUnreadCount(): Promise<number> {
  const h = await authHeaders();
  const res = await fetch(`${BASE}/unread-count`, { headers: h });
  if (!res.ok) throw new Error('fetchUnreadCount failed');
  const txt = await res.text();
  try { return JSON.parse(txt).unreadCount ?? Number(txt); } catch { return Number(txt); }
}

export async function markRead(id: number): Promise<NotificationItem> {
  const h = await authHeaders();
  const res = await fetch(`${BASE}/${id}/read`, { method: 'POST', headers: h });
  if (!res.ok) throw new Error('markRead failed');
  return res.json();
}

export async function markAllRead(): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(`${BASE}/mark-all-read`, { method: 'POST', headers: h });
  if (!res.ok) throw new Error('markAllRead failed');
}

export async function markBatchRead(ids: number[]): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(`${BASE}/mark-read-batch`, { method: 'POST', headers: h, body: JSON.stringify({ ids }) });
  if (!res.ok) throw new Error('markBatchRead failed');
}

export async function deleteOne(id: number): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: h });
  if (!res.ok) throw new Error('deleteOne failed');
}

export async function deleteBatch(ids: number[]): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(`${BASE}/delete-batch`, { method: 'POST', headers: h, body: JSON.stringify({ ids }) });
  if (!res.ok) throw new Error('deleteBatch failed');
}
