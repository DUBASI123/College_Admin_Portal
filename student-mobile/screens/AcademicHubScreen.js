import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Linking, 
  Alert 
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://YOUR_LOCAL_IP:5000/api';

export default function AcademicHubScreen() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchMaterials();
  }, [search, selectedType]);

  const fetchMaterials = async () => {
    try {
      const token = await SecureStore.getItemAsync('myvault_token');
      let url = `${API_URL}/student/content?`;
      if (selectedType !== 'all') url += `contentType=${selectedType}&`;
      if (search) url += `search=${search}&`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl, title) => {
    if (!fileUrl) {
      Alert.alert('No Link', 'This material does not have a valid link.');
      return;
    }
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://YOUR_LOCAL_IP:5000${fileUrl}`;
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Error', 'Failed to open file URL.');
    });
  };

  const types = [
    { key: 'all', label: 'All' },
    { key: 'notes', label: 'Notes' },
    { key: 'pdf', label: 'PDFs' },
    { key: 'ppt', label: 'Slides' },
    { key: 'video', label: 'Videos' },
    { key: 'lab_manual', label: 'Labs' }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Academic Hub</Text>
      
      {/* Search Input */}
      <TextInput 
        style={styles.searchBar} 
        placeholder="Search notes, slides, books..."
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
      />

      {/* Categories Horizontal */}
      <View style={styles.chipsContainer}>
        {types.map(t => (
          <TouchableOpacity 
            key={t.key} 
            style={[styles.chip, selectedType === t.key && styles.chipActive]}
            onPress={() => setSelectedType(t.key)}
          >
            <Text style={[styles.chipText, selectedType === t.key && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={materials}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.subject || 'Reference Material'} · Sem {item.semester}</Text>
                {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              </View>
              <TouchableOpacity 
                style={styles.downloadBtn}
                onPress={() => handleDownload(item.file_url, item.title)}
              >
                <Text style={styles.downloadText}>Get File</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No academic resources found matching criteria.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  searchBar: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardMeta: {
    color: '#60a5fa',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  downloadBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  downloadText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
});
