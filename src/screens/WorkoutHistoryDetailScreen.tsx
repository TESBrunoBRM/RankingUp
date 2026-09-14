import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDuration } from '../components/SessionTimer';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, WorkoutHistoryItem } from '../types';

type ExerciseLog = NonNullable<WorkoutHistoryItem['exercise_logs']>[number];

export default function WorkoutHistoryDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { logId } = useRoute<RouteProp<AppStackParamList, 'WorkoutHistoryDetail'>>().params;
  const [detail, setDetail] = useState<WorkoutHistoryItem | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    rankingUpApiClient.getWorkoutHistoryDetail(logId)
      .then((result) => { if (active) setDetail(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [logId]);

  const exercises = useMemo(() => {
    const groups = new Map<string, ExerciseLog[]>();
    for (const set of detail?.exercise_logs ?? []) {
      const items = groups.get(set.exercise_id) ?? [];
      items.push(set);
      groups.set(set.exercise_id, items);
    }
    return [...groups].map(([name, sets]) => ({ name, sets: sets.sort((a, b) => a.set_index - b.set_index) }));
  }, [detail]);

  return <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Volver al historial"><Ionicons name="arrow-back" size={24} color="#FFF" /></Pressable>
      <Text style={styles.headerTitle}>ENTRENAMIENTO</Text>
    </View>
    {loading ? <ActivityIndicator style={styles.center} color="#CCFF00" /> : error || !detail ?
      <View style={styles.center}><Text style={styles.muted}>No se pudo cargar esta sesión.</Text></View> :
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{detail.name || 'Entrenamiento'}</Text>
        <Text style={styles.date}>{new Date(detail.date).toLocaleString('es-CL')}</Text>
        <View style={styles.metrics}>
          <View><Text style={styles.metricValue}>{formatDuration(detail.duration_seconds ?? 0)}</Text><Text style={styles.metricLabel}>DURACIÓN</Text></View>
          <View><Text style={styles.metricValue}>{Number(detail.total_volume)} kg</Text><Text style={styles.metricLabel}>VOLUMEN</Text></View>
          <View><Text style={styles.metricXp}>+{detail.xp_awarded}</Text><Text style={styles.metricLabel}>XP</Text></View>
        </View>
        {exercises.length === 0 ? <Text style={styles.muted}>Esta sesión no tiene series registradas.</Text> :
          exercises.map((exercise) => <View key={exercise.name} style={styles.exercise}>
            <Pressable onPress={() => navigation.navigate('ExerciseProgress', { name: exercise.name })} style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text><Ionicons name="stats-chart-outline" size={19} color="#CCFF00" />
            </Pressable>
            {exercise.sets.map((set) => <View key={set.id} style={styles.setRow}>
              <Text style={styles.setIndex}>{set.kind === 'warmup' ? 'W' : set.set_index}</Text>
              <Text style={styles.setValue}>{Number(set.weight)} kg × {set.reps}</Text>
              {set.is_pr ? <Text style={styles.pr}>RÉCORD</Text> : null}
            </View>)}
          </View>)}
      </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#101114' },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: '#2B2E35' },
  headerTitle: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 18, paddingBottom: 42 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  date: { color: '#A8ABB0', fontSize: 13, marginTop: 5 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 24, borderBottomWidth: 1, borderColor: '#2B2E35', marginBottom: 12 },
  metricValue: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  metricXp: { color: '#CCFF00', fontSize: 17, fontWeight: '900' },
  metricLabel: { color: '#A8ABB0', fontSize: 10, fontWeight: '800', marginTop: 5 },
  exercise: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#2B2E35' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  exerciseName: { color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 14 },
  setIndex: { color: '#CCFF00', width: 24, fontSize: 12, fontWeight: '900' },
  setValue: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
  pr: { color: '#CCFF00', fontSize: 10, fontWeight: '900' },
  muted: { color: '#A8ABB0', fontSize: 13 },
});
