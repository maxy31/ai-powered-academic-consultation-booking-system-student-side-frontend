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
// Import Login and Register screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Announcement"
      screenOptions={{
        headerStyle: { backgroundColor: '#8C8CFF' },
        headerTitleStyle: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
        headerTitleAlign: 'left',
      }}
    >
      <Tab.Screen name="Announcement" component={AnnouncementScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="UploadTimetable" component={UploadTimetableScreen} />
        <Stack.Screen name="Suggestion" component={SuggestionScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;