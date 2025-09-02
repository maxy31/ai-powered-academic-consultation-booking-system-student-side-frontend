/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Background / quit-state FCM handler (must be top-level)
messaging().setBackgroundMessageHandler(async remoteMessage => {
	try {
		await notifee.createChannel({ id: 'general', name: 'General', importance: AndroidImportance.HIGH });
		await notifee.displayNotification({
			title: remoteMessage?.notification?.title || 'Notification',
			body: remoteMessage?.notification?.body,
			android: { channelId: 'general', pressAction: { id: 'default' } },
			data: remoteMessage?.data,
		});
	} catch (e) {
		// silent fail
	}
});

AppRegistry.registerComponent(appName, () => App);
