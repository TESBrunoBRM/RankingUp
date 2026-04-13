import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { nutritionLogService } from '../services/nutritionLogService';
import { workoutLogService } from '../services/workoutLogService';
import { FoodLog, Profile } from '../types';

export default function NutritionScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchNutritionData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [uProfile, dLogs] = await Promise.all([
        workoutLogService.getUserProfile(user.id),
        nutritionLogService.getDailyLogs(user.id, today)
      ]);
      setProfile(uProfile);
      setLogs(dLogs);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNutritionData();
    }, [user])
  );

  const handleDelete = async (id: string) => {
    if (!user) return;
    const success = await nutritionLogService.deleteFoodLog(id, user.id);
    if (success) {
      fetchNutritionData();
    } else {
      Alert.alert('Error', 'No se pudo eliminar el registro.');
    }
  };

  const navToSearch = () => {
    navigation.navigate('SearchFood');
  };

  // Calculate totals
  let totalCals = 0; let totalP = 0; let totalC = 0; let totalF = 0;
  logs.forEach(l => {
    totalCals += l.calories || 0;
    totalP += l.protein || 0;
    totalC += l.carbs || 0;
    totalF += l.fat || 0;
  });

  const targetCals = profile?.target_calories || 2000;
  const remaining = targetCals - totalCals;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>NUTRITION</Text>
        <Text style={styles.subtitle}>DAILY TRACKING</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Calories Card */}
        <View style={styles.summaryCard}>
          <View style={styles.caloriesRow}>
            <View style={styles.calCol}>
              <Text style={styles.calValue}>{targetCals}</Text>
              <Text style={styles.calLabel}>META</Text>
            </View>
            <Text style={styles.calOperator}>-</Text>
            <View style={styles.calCol}>
              <Text style={[styles.calValue, { color: '#CCFF00' }]}>{Math.round(totalCals)}</Text>
              <Text style={styles.calLabel}>GATO</Text>
            </View>
            <Text style={styles.calOperator}>=</Text>
            <View style={styles.calCol}>
              <Text style={[styles.calValue, { color: remaining < 0 ? '#FF3B30' : '#4CD964' }]}>{Math.round(Math.abs(remaining))}</Text>
              <Text style={styles.calLabel}>{remaining < 0 ? 'EXCESO' : 'RESTANTES'}</Text>
            </View>
          </View>

          {/* Macros Row */}
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totalC)}g</Text>
              <Text style={styles.macroLabel}>CARB</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totalP)}g</Text>
              <Text style={styles.macroLabel}>PROT</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totalF)}g</Text>
              <Text style={styles.macroLabel}>FAT</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALIMENTOS DE HOY</Text>
          <TouchableOpacity style={styles.addBtnSmall} onPress={navToSearch}>
            <Ionicons name="add" size={20} color="#121212" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#CCFF00" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="fast-food-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>NO HAY REGISTROS</Text>
            <Text style={styles.emptyText}>Trackea tus alimentos para asegurar tu progreso hacia tus metas.</Text>
            <TouchableOpacity style={styles.addBtn} onPress={navToSearch}>
              <Text style={styles.addBtnText}>+ BUSCAR ALIMENTO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logContent}>
                <Text style={styles.logName}>{log.food_name}</Text>
                <Text style={styles.logMacros}>
                  {Math.round(log.calories)} kcal • C: {Math.round(log.carbs)}g • P: {Math.round(log.protein)}g • G: {Math.round(log.fat)}g
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(log.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 24, paddingBottom: 10 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  subtitle: { fontSize: 10, color: '#A0A0A0', letterSpacing: 2, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  summaryCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 32 },
  caloriesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#2A2A2A', paddingBottom: 20 },
  calCol: { alignItems: 'center' },
  calValue: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  calLabel: { fontSize: 10, color: '#A0A0A0', fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  calOperator: { fontSize: 24, color: '#666', fontWeight: '400' },
  
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 16, fontWeight: '800', color: '#E0E0E0' },
  macroLabel: { fontSize: 10, color: '#888', fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  addBtnSmall: { backgroundColor: '#CCFF00', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  logCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  logContent: { flex: 1 },
  logName: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  logMacros: { color: '#A0A0A0', fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  
  emptyCard: { alignItems: 'center', padding: 40, backgroundColor: '#1A1A1A', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333', marginTop: 12 },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: 16, marginBottom: 8, letterSpacing: 1 },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 12, marginBottom: 24, lineHeight: 18 },
  addBtn: { backgroundColor: '#2A2A2A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  addBtnText: { color: '#CCFF00', fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});
