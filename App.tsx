import { enableScreens } from 'react-native-screens';

enableScreens();

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UploadTimetableScreen from './src/screens/UploadTimetableScreen';
import SuggestionScreen from './src/screens/SuggestionScreen';
import AnnouncementScreen from './src/screens/AnnouncementScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
// Import Login and Register screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import { NotificationsProvider, useNotifications } from './src/notifications/NotificationContext';
import { navigationRef } from './src/notifications/navigationRef';
// initMessaging will be triggered post-login for token availability
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPushAfterLogin } from './src/push/fcm';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HeaderBell({ navigation }: any) {
  const { unreadCount } = useNotifications();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ marginRight: 16 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View>
        <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={24} color="#fff" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Announcement"
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: '#8C8CFF' },
        headerTitleStyle: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
        headerTitleAlign: 'left',
        tabBarActiveTintColor: '#5B5BFF',
        headerRight: () => <HeaderBell navigation={navigation} />,
      })}
    >
      <Tab.Screen name="Announcement" component={AnnouncementScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="megaphone-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

const App = () => {
  React.useEffect(() => {
    // Auto-init if token already persisted (app relaunched while logged in)
    (async () => {
      const jwt = await AsyncStorage.getItem('jwtToken');
      if (jwt) initPushAfterLogin().catch(()=>{});
    })();
  }, []);
  return (
    <NotificationsProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          {/* Notifications screen as a stack page with its own header */}
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#8C8CFF' },
            headerTitleStyle: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
            headerTintColor: '#fff',
            headerTitle: 'Notifications'
          }} />
          <Stack.Screen name="UploadTimetable" component={UploadTimetableScreen} />
          <Stack.Screen name="Suggestion" component={SuggestionScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </Stack.Navigator>
  </NavigationContainer>
    </NotificationsProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FF4D4F',
    borderRadius: 10,
    minWidth: 16,
    paddingHorizontal: 4,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});