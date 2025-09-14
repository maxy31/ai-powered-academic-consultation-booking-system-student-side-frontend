import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';

type RootStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Login: undefined;
  UploadTimetable: undefined;
};

const ProfileScreen = () => {
  const [profile, setProfile] = useState<{ studentName: string; username: string } | null>(null);
  const [latestBooking, setLatestBooking] = useState<{ date: string; startTime: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Safely parse JSON to avoid "Unexpected end of input" when body is empty
  const parseJsonSafely = async (res: any) => {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      // Re-throw with clearer message but log original for debugging
      console.warn('Failed to parse JSON from', res?.url, 'status:', res?.status, 'body:', text);
      throw new Error('Received invalid JSON from server');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const fetchProfileAndBooking = async () => {
        setLoading(true);
        try {
          const token = await AsyncStorage.getItem('jwtToken');
          if (!token) {
            throw new Error('Authentication token not found');
          }
          
          // Fetch profile and latest booking in parallel
          const [profileRes, bookingRes] = await Promise.all([
            fetch('http://10.0.2.2:8080/api/profile/getProfileStudent', {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch('http://10.0.2.2:8080/api/appointments/getLatestBooking', {
              headers: { 'Authorization': `Bearer ${token}` },
            })
          ]);

          if (!profileRes.ok) throw new Error('Failed to fetch profile');
          const profileData = await parseJsonSafely(profileRes);
          if (!profileData) throw new Error('Profile response was empty');
          if (isActive) setProfile(profileData);

          // Handle booking: 404/204/no body => no upcoming booking
          if (bookingRes.status === 404 || bookingRes.status === 204) {
            if (isActive) setLatestBooking(null);
          } else if (bookingRes.ok) {
            const bookingData = await parseJsonSafely(bookingRes);
            if (isActive) setLatestBooking(bookingData ?? null);
          } else {
            // Non-OK and not 404 => error
            throw new Error('Failed to fetch booking');
          }
        } catch (err) {
          if (isActive) {
            // Show friendly error, log the technical details
            console.warn('Profile/Booking load error:', err);
            Alert.alert('Error', 'Could not load profile or booking data. Please try again.');
          }
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchProfileAndBooking();
      return () => { isActive = false; };
    }, [])
  );

  // Logout handler with confirmation
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');
              await fetch('http://10.0.2.2:8080/api/auth/logout', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              await AsyncStorage.removeItem('jwtToken');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (err) {
              Alert.alert('Error', 'Logout failed');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>
              {loading ? <ActivityIndicator color="#fff" /> : profile?.studentName || 'Student Name'}
            </Text>
            <Text style={styles.studentId}>
              {loading ? '' : profile?.username || 'Student ID'}
            </Text>
          </View>
          <Image
            source={{ uri: 'https://via.placeholder.com/80' }}
            style={styles.profileImage}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.bookingSection}>
          <Text style={styles.bookingTitle}>Upcoming Booking:</Text>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : latestBooking ? (
            <>
              <Text style={styles.bookingText}>Date: {latestBooking.date}</Text>
              <Text style={styles.bookingText}>Time: {latestBooking.startTime}</Text>
            </>
          ) : (
            <Text style={styles.bookingText}>No upcoming booking</Text>
          )}
        </View>
      </View>
      <ActionButton text="Upload Timetable" onPress={() => navigation.navigate('UploadTimetable')} />
      <ActionButton text="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
      <ActionButton text="Log Out" onPress={handleLogout} />
    </ScrollView>
  );
};

// Reusable ActionButton component
const ActionButton = ({ text, onPress }: { text: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Text style={styles.actionButtonText}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 1,
  },
  profileCard: {
    width: '90%',
    backgroundColor: '#8C8CFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 2,
  },
  studentId: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginLeft: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#fff',
    marginVertical: 8,
    opacity: 0.5,
  },
  bookingSection: {
    marginLeft: 4,
  },
  bookingTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  bookingText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 2,
  },
  actionButton: {
    width: '90%',
    backgroundColor: '#8C8CFF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
});

export default ProfileScreen;