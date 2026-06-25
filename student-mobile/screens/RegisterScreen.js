import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import axios from 'axios';

const API_URL = 'http://YOUR_LOCAL_IP:5050/api';

export default function RegisterScreen({ navigation }) {
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form parameters
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('1');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchColleges();
  }, []);

  useEffect(() => {
    if (selectedCollegeId) {
      fetchDepartments(selectedCollegeId);
    }
  }, [selectedCollegeId]);

  const fetchColleges = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/colleges`);
      setColleges(res.data);
      if (res.data.length > 0) setSelectedCollegeId(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async (collegeId) => {
    try {
      const res = await axios.get(`${API_URL}/auth/colleges/${collegeId}/departments`);
      setDepartments(res.data);
      if (res.data.length > 0) setSelectedDeptId(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !selectedCollegeId) {
      Alert.alert('Required Fields', 'Name, email, password, and college selection are mandatory.');
      return;
    }

    setLoading(true);
    const payload = {
      collegeId: selectedCollegeId,
      departmentId: selectedDeptId || null,
      name,
      email,
      phone,
      rollNumber,
      yearOfStudy: parseInt(yearOfStudy),
      password
    };

    try {
      await axios.post(`${API_URL}/auth/student/register`, payload);
      setLoading(false);
      Alert.alert(
        'Registration Submitted',
        'Your profile has been queued. You can log in once your college administrator approves your account.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollInner}>
      <Text style={styles.title}>Register Account</Text>
      <Text style={styles.subtitle}>Awaiting approval before access is granted.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Select College *</Text>
        {colleges.length === 0 ? (
          <ActivityIndicator color="#60a5fa" />
        ) : (
          <View style={styles.pickerFake}>
            {colleges.map(college => (
              <TouchableOpacity 
                key={college.id} 
                style={[
                  styles.pickerItem, 
                  selectedCollegeId === college.id && styles.pickerItemActive
                ]}
                onPress={() => setSelectedCollegeId(college.id)}
              >
                <Text style={styles.pickerText}>{college.name}{college.district ? `\n${college.district}` : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Select Department *</Text>
        <View style={styles.pickerFake}>
          {departments.map(dept => (
            <TouchableOpacity 
              key={dept.id} 
              style={[
                styles.pickerItem, 
                selectedDeptId === dept.id && styles.pickerItemActive
              ]}
              onPress={() => setSelectedDeptId(dept.id)}
            >
              <Text style={styles.pickerText}>{dept.name} ({dept.code})</Text>
            </TouchableOpacity>
          ))}
          {departments.length === 0 && <Text style={{ color: '#64748b', fontStyle: 'italic', padding: 8 }}>Select a college first.</Text>}
        </View>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. John Doe" 
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Roll Number</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. CSE-2026-44" 
          placeholderTextColor="#64748b"
          value={rollNumber}
          onChangeText={setRollNumber}
        />

        <Text style={styles.label}>Year of Study *</Text>
        <View style={styles.pickerFakeHorizontal}>
          {['1', '2', '3', '4', '5'].map(y => (
            <TouchableOpacity 
              key={y} 
              style={[styles.chip, yearOfStudy === y && styles.chipActive]}
              onPress={() => setYearOfStudy(y)}
            >
              <Text style={styles.chipText}>{y} Yr</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Email Address *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. john@university.edu" 
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="••••••••" 
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginVertical: 20 }}>
        <Text style={styles.footerText}>
          Already have an account? <Text style={styles.footerLink}>Log In</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
  },
  scrollInner: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    marginTop: 4,
  },
  form: {
    backgroundColor: '#121824',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#1b2336',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  pickerFake: {
    backgroundColor: '#1b2336',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 8,
  },
  pickerItem: {
    padding: 10,
    borderRadius: 6,
  },
  pickerItemActive: {
    backgroundColor: '#2563eb',
  },
  pickerText: {
    color: '#fff',
    fontSize: 13,
  },
  pickerFakeHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1b2336',
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  chipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
  },
  footerLink: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
});
