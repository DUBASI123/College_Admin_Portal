import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://YOUR_LOCAL_IP:5000/api';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await SecureStore.getItemAsync('myvault_token');
      const userStr = await SecureStore.getItemAsync('myvault_user');
      
      if (!token || !userStr) {
        navigation.replace('Login');
        return;
      }
      
      setUser(JSON.parse(userStr));
      
      // Fetch notices
      const res = await axios.get(`${API_URL}/student/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      Alert.alert('Connection Error', 'Failed to retrieve notifications from server.');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('myvault_token');
    await SecureStore.deleteItemAsync('myvault_user');
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{user?.name || 'Student'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Navigation Cards */}
        <Text style={styles.sectionTitle}>Portals</Text>
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.navCard}
            onPress={() => navigation.navigate('AcademicHub')}
          >
            <Text style={styles.cardIcon}>📚</Text>
            <Text style={styles.cardTitle}>Academic Hub</Text>
            <Text style={styles.cardSub}>Notes, PDFs, PPTs, Video links</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navCard}
            onPress={() => navigation.navigate('Opportunities')}
          >
            <Text style={styles.cardIcon}>💼</Text>
            <Text style={styles.cardTitle}>Career Board</Text>
            <Text style={styles.cardSub}>Internships, job postings</Text>
          </TouchableOpacity>
        </View>

        {/* Notices */}
        <Text style={styles.sectionTitle}>Announcements</Text>
        {notifications.map(note => (
          <View key={note.id} style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Text style={styles.noticeTitle}>{note.title}</Text>
              <Text style={styles.noticeTag}>{note.type}</Text>
            </View>
            <Text style={styles.noticeBody}>{note.body}</Text>
            <Text style={styles.noticeTime}>{new Date(note.sent_at).toLocaleDateString()}</Text>
          </View>
        ))}

        {notifications.length === 0 && (
          <Text style={styles.noNotices}>No announcements listed yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  nameText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
  },
  noticeCard: {
    backgroundColor: '#121824',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginBottom: 10,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    flex: 1,
  },
  noticeTag: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  noticeBody: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
  noticeTime: {
    color: '#64748b',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 6,
  },
  noNotices: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 20,
  },
});
