import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from './navigationRef';

const API_BASE = 'http://10.0.2.2:8080';

async function postDeviceToken(token: string) {
  try {
    const jwt = await AsyncStorage.getItem('jwtToken');
    if (!jwt) return;
    await fetch(`${API_BASE}/api/notifications/register-device`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: 'ANDROID' })
    });
    console.log('[FCM] token registered to backend length=', token.length);
  } catch (e) {
    console.warn('[MessagingSetup] postDeviceToken failed', e);
  }
}

export async function getCurrentFcmToken() {
  try {
    const t = await messaging().getToken();
    console.log('[FCM] getToken() =>', t);
    return t;
  } catch (e) {
    console.warn('[FCM] getToken error', e);
    return null;
  }
}

async function obtainTokenWithRetry(retries = 5, delayMs = 1500): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    const token = await getCurrentFcmToken();
    if (token) return token;
    if (i < retries) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return null;
}

export async function initMessaging() {
  try {
    await notifee.requestPermission();
    await notifee.createChannel({ id: 'general', name: 'General', importance: AndroidImportance.HIGH });
  } catch {}

  // FCM permission (mainly iOS; Android auto granted <13)
  await messaging().requestPermission().catch(()=>{});

  const currentToken = await obtainTokenWithRetry();
  if (currentToken) {
    await postDeviceToken(currentToken);
  } else {
    console.warn('[FCM] Failed to obtain token after retries');
  }

  messaging().onTokenRefresh(t => postDeviceToken(t));

  // Foreground messages
  messaging().onMessage(async remoteMessage => {
    const id = remoteMessage.messageId || String(Date.now());
    await notifee.displayNotification({
      id,
      title: remoteMessage.notification?.title || 'Notification',
      body: remoteMessage.notification?.body,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      data: remoteMessage.data,
    });
  });

  // Background & quit tap handling (register background handler once at entrypoint ideally)
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    // no-op; notifee can handle display if using data-only with custom logic
  });

  // When user taps a notification (foreground/background)
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNavigate(detail.notification?.data);
    }
  });
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNavigate(detail.notification?.data);
    }
  });
}

function handleNavigate(data: any) {
  if (!data) return;
  // Example: if server sends relatedAppointmentId navigate to a detail screen (placeholder)
  if (data.relatedAppointmentId) {
    navigate('AppointmentDetail', { id: data.relatedAppointmentId });
  } else {
    navigate('Notifications');
  }
}
