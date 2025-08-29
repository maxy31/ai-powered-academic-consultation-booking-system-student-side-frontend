import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AnnouncementScreen = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('jwtToken');
        const res = await fetch('http://10.0.2.2:8080/api/announcements/getAnnouncement', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        if (Array.isArray(data.announcementList)) {
          setAnnouncements(data.announcementList);
          setError(null);
        } else {
          setAnnouncements([]);
          setError('Invalid data format from server.');
        }
      } catch (err) {
        setError('Failed to fetch announcements.');
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  return (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.scroll}>
      {loading ? (
        <ActivityIndicator size="large" color="#8C8CFF" />
      ) : error ? (
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>{error}</Text>
      ) : announcements.length === 0 ? (
        <Text style={{ color: '#8C8CFF', textAlign: 'center', marginTop: 20 }}>No announcements available.</Text>
      ) : (
        announcements.map((a: any) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.authorName}>{a.publisherName}</Text>
            <Text style={styles.content}>{a.content}</Text>
            <View style={styles.divider} />
            <View style={styles.cardFooter}>
              <View style={{ flex: 1 }} />
              <Ionicons name="thumbs-up-outline" size={22} color="#fff" style={styles.likeIcon} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scroll: { 
    padding: 18, 
    paddingBottom: 90 
  },
  card: {
    backgroundColor: '#8C8CFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 28,
    minHeight: 120,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 8,
  },
  author: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  authorName: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  content: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  divider: {
    borderBottomColor: '#fff',
    borderBottomWidth: 1,
    opacity: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 28,
  },
  likeIcon: {
    alignSelf: 'flex-end',
  },
});

export default AnnouncementScreen;