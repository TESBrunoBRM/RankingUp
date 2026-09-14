import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDuration } from '../components/SessionTimer';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, WorkoutHistoryItem } from '../types';

export default function WorkoutHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [items, setItems] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { setItems((await rankingUpApiClient.getWorkoutHistory()).items); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFF" /></Pressable><Text style={styles.title}>HISTORIAL</Text></View>
    {loading ? <ActivityIndicator style={{ flex: 1 }} color="#CCFF00" /> : error ? <Pressable onPress={() => void load()} style={styles.center}><Text style={styles.empty}>No se pudo cargar. Toca para reintentar.</Text></Pressable> :
      <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>Tus entrenamientos aparecerán aquí.</Text>} renderItem={({ item }) =>
        <Pressable onPress={() => navigation.navigate('WorkoutHistoryDetail', { logId: item.id })} style={styles.row} accessibilityLabel={`Ver detalle de ${item.name || 'Entrenamiento'}`}>
          <Text style={styles.name}>{item.name || 'Entrenamiento'}</Text><Text style={styles.meta}>{new Date(item.date).toLocaleDateString('es-CL')}  ·  {formatDuration(item.duration_seconds ?? 0)}  ·  {Number(item.total_volume)} kg</Text><Text style={styles.xp}>+{item.xp_awarded} XP</Text>
        </Pressable>} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#101114' }, header: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: '#2B2E35' },
  title: { color: '#FFF', fontSize: 19, fontWeight: '900' }, list: { padding: 18, flexGrow: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2B2E35', gap: 5 }, name: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  meta: { color: '#9A9FA6', fontSize: 12 }, xp: { color: '#CCFF00', fontSize: 12, fontWeight: '900' }, empty: { color: '#9A9FA6', textAlign: 'center', marginTop: 40 },
});
