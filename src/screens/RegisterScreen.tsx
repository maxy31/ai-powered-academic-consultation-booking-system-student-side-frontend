import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Advisor {
  id: number;
  name: string;
}

const RegisterScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    advisorId: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedAdvisorName, setSelectedAdvisorName] = useState('');

  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const res = await fetch('http://10.0.2.2:8080/api/auth/showAdvisors');
        if (res.ok) {
          const data = await res.json();
          setAdvisors(data);
        } else {
          Alert.alert('Error', 'Failed to fetch advisors.');
        }
      } catch (error) {
        Alert.alert('Error', 'Could not connect to server to fetch advisors.');
      }
    };
    fetchAdvisors();
  }, []);

  const handleChange = (key: string, value: any) => setForm({ ...form, [key]: value });

  const handleSelectAdvisor = (advisor: Advisor) => {
    handleChange('advisorId', advisor.id);
    setSelectedAdvisorName(advisor.name);
    setModalVisible(false);
  };

  const handleRegister = async () => {
    // basic client-side check
    if (!form.username || !form.password || !form.firstName || !form.advisorId) {
      Alert.alert('Missing fields', 'Please fill in all fields, including advisor selection.');
      return;
    }
    setLoading(true);
    try {
      // Send form data to the server
      const res = await fetch('http://10.0.2.2:8080/api/auth/registerStudent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        Alert.alert('Success', 'Registration successful. Please login.');
        navigation.goBack();
      } else {
        const txt = await res.text();
        Alert.alert('Registration Failed', txt || 'Please check your details.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../img/LOGO-UTAR.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Create Student Account</Text>
        </View>

        <View style={styles.form}>
          {/* ... other inputs ... */}
          <View style={styles.inputRow}>
            <Ionicons name="at-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Username" value={form.username} onChangeText={v => handleChange('username', v)} autoCapitalize="none" />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="First Name" value={form.firstName} onChangeText={v => handleChange('firstName', v)} />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Last Name" value={form.lastName} onChangeText={v => handleChange('lastName', v)} />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={v => handleChange('email', v)} keyboardType="email-address" />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Phone Number" value={form.phoneNumber} onChangeText={v => handleChange('phoneNumber', v)} keyboardType="phone-pad" />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Password" value={form.password} onChangeText={v => handleChange('password', v)} secureTextEntry />
          </View>

          <TouchableOpacity style={styles.inputRow} onPress={() => setModalVisible(true)}>
            <Ionicons name="person-circle-outline" size={18} color="#8C8CFF" style={{ marginRight: 10 }} />
            <Text style={[styles.input, !selectedAdvisorName && styles.placeholderText]}>
              {selectedAdvisorName || "Select an Advisor"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} activeOpacity={0.86}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Register</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select an Advisor</Text>
            <FlatList
              data={advisors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.advisorItem} onPress={() => handleSelectAdvisor(item)}>
                  <Text style={styles.advisorName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 18, paddingBottom: 36, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 6 },
  logo: { width: 110, height: 110, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#8C8CFF' },
  form: { width: '100%', marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee', marginTop: 12, minHeight: 50 },
  input: { flex: 1, fontSize: 15, color: '#222' },
  placeholderText: { color: '#999' },
  registerButton: { marginTop: 20, backgroundColor: '#8C8CFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#8C8CFF', shadowOpacity: 0.16, shadowRadius: 12, elevation: 3 },
  registerButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#666', marginTop: 16 },
  linkBold: { color: '#8C8CFF', fontWeight: '700' },
  loginLink: { marginTop: 8 },
  // Modal Styles
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  advisorItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  advisorName: { fontSize: 16 },
  closeButton: { marginTop: 20, backgroundColor: '#f0f0f0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#333', fontWeight: '700', fontSize: 16 },
});

export default RegisterScreen;