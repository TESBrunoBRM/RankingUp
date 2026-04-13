import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Profile } from '../types';
import { workoutLogService } from '../services/workoutLogService';
import { authService } from '../services/auth';

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [targetCals, setTargetCals] = useState('');
  const [goal, setGoal] = useState<'bajar' | 'mantener' | 'subir'>('mantener');

  const fetchProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const pData = await workoutLogService.getUserProfile(user.id);
      setProfile(pData);
      if (pData) {
        setWeight(pData.weight?.toString() || '');
        setHeight(pData.height?.toString() || '');
        setTargetCals(pData.target_calories?.toString() || '');
        if (pData.goal) setGoal(pData.goal);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [user])
  );

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const w = parseFloat(weight);
      const h = parseFloat(height);
      const c = parseInt(targetCals, 10);
      
      if (isNaN(w) || isNaN(h) || isNaN(c)) {
        Alert.alert('Error', 'Por favor ingresa números válidos');
        setSaving(false);
        return;
      }

      await workoutLogService.updateProfileMetrics(user.id, w, h, goal, c);
      Alert.alert('Actualizado', 'Tu perfil ha sido actualizado con éxito.');
      fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TU PERFIL</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#CCFF00" size="large" style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView 
           behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
           style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* User Info Header */}
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#121212" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.emailText}>{user?.email}</Text>
                <Text style={styles.xpText}>{profile?.xp || 0} XP TOTALES</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MÉTRICAS FÍSICAS</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Ej. 75"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Altura (cm)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Ej. 175"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Objetivo Calórico Diario</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={targetCals}
                  onChangeText={setTargetCals}
                  placeholder="Ej. 2500"
                  placeholderTextColor="#666"
                />
              </View>

              <Text style={styles.label}>Meta de Entrenamiento</Text>
              <View style={styles.goalRow}>
                <TouchableOpacity 
                   style={[styles.goalBtn, goal === 'bajar' && styles.goalBtnActive]}
                   onPress={() => setGoal('bajar')}
                >
                  <Text style={[styles.goalText, goal === 'bajar' && styles.goalTextActive]}>Definir</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.goalBtn, goal === 'mantener' && styles.goalBtnActive]}
                   onPress={() => setGoal('mantener')}
                >
                  <Text style={[styles.goalText, goal === 'mantener' && styles.goalTextActive]}>Mantener</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.goalBtn, goal === 'subir' && styles.goalBtnActive]}
                   onPress={() => setGoal('subir')}
                >
                  <Text style={[styles.goalText, goal === 'subir' && styles.goalTextActive]}>Volumen</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</Text>
            </TouchableOpacity>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>ZONA DE PELIGRO</Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 16, color: '#FFFFFF', fontWeight: '900', letterSpacing: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  userCard: { backgroundColor: '#CCFF00', borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  userInfo: { flex: 1 },
  emailText: { fontSize: 18, fontWeight: '900', color: '#121212', marginBottom: 4 },
  xpText: { fontSize: 12, fontWeight: '800', color: '#333', letterSpacing: 1 },
  
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#A0A0A0', letterSpacing: 2 },
  
  formCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { color: '#FFF', fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#121212', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, color: '#FFF', fontSize: 16 },
  
  goalRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  goalBtn: { flex: 1, backgroundColor: '#121212', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  goalBtnActive: { backgroundColor: '#CCFF00', borderColor: '#CCFF00' },
  goalText: { color: '#A0A0A0', fontWeight: '700', fontSize: 12 },
  goalTextActive: { color: '#121212', fontWeight: '900' },

  saveBtn: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 40 },
  saveBtnText: { color: '#121212', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  dangerZone: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  dangerTitle: { fontSize: 12, fontWeight: '900', color: '#FF3B30', letterSpacing: 2, marginBottom: 16, textAlign: 'center' },
  logoutBtn: { flexDirection: 'row', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  logoutText: { color: '#FF3B30', fontWeight: '800', fontSize: 14, marginLeft: 8 },
});
