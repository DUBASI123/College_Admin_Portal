import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://YOUR_LOCAL_IP:5050/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(false);
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/auth/student/login`, { email, password });
      
      const { token, student } = res.data;
      await SecureStore.setItemAsync('myvault_token', token);
      await SecureStore.setItemAsync('myvault_user', JSON.stringify(student));
      
      setLoading(false);
      navigation.replace('Home');
    } catch (err) {
      setLoading(false);
      const errorMsg = err.response?.data?.error;
      const message = err.response?.data?.message;

      if (errorMsg === 'pending_approval') {
        Alert.alert(
          'Verification Pending',
          'Your account registration request is awaiting approval from your college administrator.'
        );
      } else {
        Alert.alert('Login Failed', message || 'Invalid credentials');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View className="inner" style={styles.inner}>
        <Text style={styles.brandTitle}>My<Text style={styles.brandAccent}>Vault</Text></Text>
        <Text style={styles.subtitle}>Student Academic &amp; Career Space</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="student@college.edu" 
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerText}>
            New student? <Text style={styles.footerLink}>Register Here</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  brandAccent: {
    color: '#60a5fa',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 4,
  },
  form: {
    backgroundColor: '#121824',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1b2336',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
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
    marginTop: 24,
    fontSize: 14,
  },
  footerLink: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
});
