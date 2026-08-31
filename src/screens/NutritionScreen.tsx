import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { nutritionLogService } from '../services/nutritionLogService';
import { AppStackParamList, FoodLog, NutritionSummaryResponse } from '../types';
import { getLocalDateString } from '../utils/date';
import { getErrorMessage } from '../utils/errors';

export default function NutritionScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'MainTabs'>>();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [summary, setSummary] = useState<NutritionSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchNutritionData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const today = getLocalDateString();
      const dailySummary = await nutritionLogService.getDailySummary(today);
      setSummary(dailySummary);
      setLogs(dailySummary.logs);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo cargar nutrición.');
      console.warn('NutritionScreen:', message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void fetchNutritionData();
    }, [fetchNutritionData])
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

  const totalCals = summary?.totals.calories ?? 0;
  const totalP = summary?.totals.protein ?? 0;
  const totalC = summary?.totals.carbs ?? 0;
  const totalF = summary?.totals.fat ?? 0;
  const targetCals = summary?.targets.calories ?? 2000;
  const targetP = summary?.targets.protein ?? 0;
  const targetC = summary?.targets.carbs ?? 0;
  const targetF = summary?.targets.fat ?? 0;
  const remaining = summary?.remainingCalories ?? targetCals;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>NUTRICION</Text>
        <Text style={styles.subtitle}>REGISTRO DIARIO</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {errorMessage ? (
          <View style={styles.errorNotice}>
            <Ionicons name="cloud-offline-outline" size={22} color="#FFB020" />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>NO SE PUDO ACTUALIZAR</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Reintentar carga de nutrición"
              style={styles.retryButton}
              onPress={() => void fetchNutritionData()}
            >
              <Ionicons name="refresh" size={20} color="#121212" />
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && !summary ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#CCFF00" />
            <Text style={styles.loadingText}>CARGANDO RESUMEN</Text>
          </View>
        ) : null}

        {/* Calories Card */}
        {summary ? <View style={styles.summaryCard}>
          <View style={styles.caloriesRow}>
            <View style={styles.calCol}>
              <Text style={styles.calValue}>{targetCals}</Text>
              <Text style={styles.calLabel}>META</Text>
            </View>
            <Text style={styles.calOperator}>-</Text>
            <View style={styles.calCol}>
              <Text style={[styles.calValue, { color: '#CCFF00' }]}>{Math.round(totalCals)}</Text>
              <Text style={styles.calLabel}>CONSUMIDO</Text>
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
              <Text style={styles.macroValue}>{Math.round(totalC)}/{targetC}g</Text>
              <Text style={styles.macroLabel}>CARB</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totalP)}/{targetP}g</Text>
              <Text style={styles.macroLabel}>PROT</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totalF)}/{targetF}g</Text>
              <Text style={styles.macroLabel}>GRASAS</Text>
            </View>
          </View>
        </View> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALIMENTOS DE HOY</Text>
          <TouchableOpacity style={styles.addBtnSmall} onPress={navToSearch}>
            <Ionicons name="add" size={20} color="#121212" />
          </TouchableOpacity>
        </View>

        {loading && summary ? (
          <ActivityIndicator color="#CCFF00" style={{ marginTop: 40 }} />
        ) : errorMessage && !summary ? (
          <View style={styles.emptyCard}>
            <Ionicons name="warning-outline" size={44} color="#FFB020" />
            <Text style={styles.emptyTitle}>SIN DATOS DISPONIBLES</Text>
            <Text style={styles.emptyText}>Revisa que la API esté activa y vuelve a intentarlo.</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="fast-food-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>NO HAY REGISTROS</Text>
              <Text style={styles.emptyText}>Registra tus alimentos para mantener tu progreso alineado con tus metas.</Text>
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
  container: { flex: 1, backgroundColor: '#101114' },
  header: { padding: 24, paddingBottom: 10 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  subtitle: { fontSize: 10, color: '#A0A0A0', letterSpacing: 2, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  errorNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#211D14', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#594719', marginBottom: 16 },
  errorContent: { flex: 1 },
  errorTitle: { color: '#FFB020', fontSize: 11, fontWeight: '900' },
  errorText: { color: '#D6D6D6', fontSize: 12, lineHeight: 17, marginTop: 3 },
  retryButton: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CCFF00' },
  loadingPanel: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 24 },
  loadingText: { color: '#A0A0A0', fontSize: 11, fontWeight: '800' },

  summaryCard: { backgroundColor: '#1A1A1A', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 32 },
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
  
  logCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  logContent: { flex: 1 },
  logName: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  logMacros: { color: '#A0A0A0', fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  
  emptyCard: { alignItems: 'center', padding: 40, backgroundColor: '#1A1A1A', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333', marginTop: 12 },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: 16, marginBottom: 8, letterSpacing: 1 },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 12, marginBottom: 24, lineHeight: 18 },
  addBtn: { backgroundColor: '#2A2A2A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  addBtnText: { color: '#CCFF00', fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});
