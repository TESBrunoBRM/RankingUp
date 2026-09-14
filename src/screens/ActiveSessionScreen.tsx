import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RestTimerBar } from '../components/RestTimerBar';
import { NumericKeypad } from '../components/NumericKeypad';
import { SessionTimer } from '../components/SessionTimer';
import { SetTypeSheet } from '../components/SetTypeSheet';
import { exerciseApi } from '../services/exerciseApi';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { useAuthStore } from '../store/authStore';
import type { AppStackParamList, Exercise, SessionPreview, WorkoutLogInput } from '../types';
import { getErrorMessage } from '../utils/errors';

type Nav = NativeStackNavigationProp<AppStackParamList, 'LogWorkout'>;
type SetRow = { id: string; weight: string; reps: string; kind: 'normal' | 'warmup'; completed: boolean };
type ExerciseRow = SessionPreview['exercises'][number] & { details?: Exercise; rows: SetRow[] };
type Draft = { startedAt: number; clientSessionId: string; name: string; exercises: ExerciseRow[]; updatedAt: number };

const makeRows = (exercise: SessionPreview['exercises'][number]): SetRow[] =>
  Array.from({ length: Math.max(1, exercise.sets) }, (_, index) => ({
    id: `${exercise.id}-${index}`, weight: '', reps: String(exercise.reps), kind: 'normal', completed: false,
  }));

export default function ActiveSessionScreen() {
  useKeepAwake();
  const route = useRoute<RouteProp<AppStackParamList, 'LogWorkout'>>();
  const navigation = useNavigation<Nav>();
  const { workoutId } = route.params;
  const userId = useAuthStore((state) => state.user?.id);
  const draftKey = `session:draft:${userId}:${workoutId}`;
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [name, setName] = useState('Entrenamiento');
  const [startedAt, setStartedAt] = useState(Date.now());
  const [clientSessionId, setClientSessionId] = useState(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [typeTarget, setTypeTarget] = useState<{ exerciseId: string; rowId: string } | null>(null);
  const [restEditorOpen, setRestEditorOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ exerciseId: string; rowId: string; field: 'weight' | 'reps' } | null>(null);
  const savingRef = useRef(false);
  const finishRest = useCallback(() => setRestEndAt(null), []);

  useEffect(() => {
    let active = true;
    const loadPreview = async () => {
      try {
        const preview = await rankingUpApiClient.getSessionPreview(workoutId);
        const rows = preview.exercises.map((exercise) => ({ ...exercise, rows: makeRows(exercise) }));
        if (!active) return;
        setName(preview.workout.name);
        setExercises(rows);
        setReady(true);
        void exerciseApi.primeExercises(rows.map((exercise) => exercise.exercise_id)).then(async () => {
          const details = await Promise.all(rows.map((exercise) => exerciseApi.getExerciseByName(exercise.exercise_id).catch(() => undefined)));
          if (active) setExercises((current) => current.map((exercise, index) => ({ ...exercise, details: details[index] })));
        }).catch(() => undefined);
      } catch (error) {
        if (active) Alert.alert('No se pudo cargar la rutina', getErrorMessage(error, 'Intenta de nuevo cuando haya conexion.'), [{ text: 'Volver', onPress: () => navigation.goBack() }]);
      }
    };
    const load = async () => {
      const saved = await AsyncStorage.getItem(draftKey).catch(() => null);
      if (!active) return;
      if (saved) {
        try {
          const draft = JSON.parse(saved) as Draft;
          if (Date.now() - draft.updatedAt < 6 * 60 * 60 * 1000 && draft.exercises.length > 0) {
            Alert.alert('Sesion sin terminar', '¿Retomar el entrenamiento anterior?', [
              { text: 'Empezar de nuevo', style: 'destructive', onPress: () => { void AsyncStorage.removeItem(draftKey); void loadPreview(); } },
              { text: 'Retomar', onPress: () => {
                if (!active) return;
                setExercises(draft.exercises); setName(draft.name || 'Entrenamiento');
                setStartedAt(draft.startedAt); setClientSessionId(draft.clientSessionId); setReady(true);
              } },
            ], { cancelable: false });
            return;
          }
        } catch { void AsyncStorage.removeItem(draftKey); }
      }
      await loadPreview();
    };
    void load();
    return () => { active = false; };
  }, [workoutId, draftKey, navigation]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(draftKey, JSON.stringify({ startedAt, clientSessionId, name, exercises, updatedAt: Date.now() } satisfies Draft));
    }, 500);
    return () => clearTimeout(timer);
  }, [ready, startedAt, clientSessionId, name, exercises, draftKey]);

  const updateRow = (exerciseId: string, rowId: string, change: Partial<SetRow>) => {
    setExercises((current) => current.map((exercise) => exercise.id === exerciseId
      ? { ...exercise, rows: exercise.rows.map((row) => row.id === rowId ? { ...row, ...change } : row) }
      : exercise));
  };

  const completeRow = (exercise: ExerciseRow, row: SetRow) => {
    if (!row.completed) {
      const weight = Number(row.weight.replace(',', '.'));
      const reps = Number(row.reps);
      if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1 || reps > 100) {
        Alert.alert('Serie incompleta', 'Indica peso y repeticiones validos.');
        return;
      }
      const restSeconds = exercise.rest_seconds ?? 90;
      setRestEndAt(restSeconds > 0 ? Date.now() + restSeconds * 1000 : null);
    }
    updateRow(exercise.id, row.id, { completed: !row.completed });
  };

  const save = async () => {
    if (savingRef.current) return;
    const sets: WorkoutLogInput[] = exercises.flatMap((exercise) => exercise.rows.flatMap((row, index) => row.completed
      ? [{ exercise_id: exercise.exercise_id, weight: Number(row.weight.replace(',', '.')), reps: Number(row.reps), kind: row.kind, setIndex: index + 1 }]
      : []));
    if (!sets.length) { Alert.alert('Sin series', 'Completa al menos una serie para guardar el entrenamiento.'); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      const durationSeconds = Math.min(86400, Math.floor((Date.now() - startedAt) / 1000));
      const result = await rankingUpApiClient.logWorkoutSession(workoutId, sets, { startedAt: new Date(startedAt).toISOString(), durationSeconds, name, clientSessionId });
      await AsyncStorage.removeItem(draftKey);
      navigation.replace('SessionSummary', { summary: result, name, date: new Date().toISOString() });
    } catch (error) {
      Alert.alert('No se pudo guardar', getErrorMessage(error, 'Reintenta cuando haya conexion. El borrador se conserva.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const active = exercises[activeIndex];
  const currentRow = activeCell ? exercises.find((exercise) => exercise.id === activeCell.exerciseId)?.rows.find((row) => row.id === activeCell.rowId) : null;
  const nextCell = () => {
    if (!activeCell) return;
    if (activeCell.field === 'weight') { setActiveCell({ ...activeCell, field: 'reps' }); return; }
    const exercise = exercises.find((item) => item.id === activeCell.exerciseId);
    const index = exercise?.rows.findIndex((row) => row.id === activeCell.rowId) ?? -1;
    const next = exercise?.rows[index + 1];
    setActiveCell(next ? { exerciseId: activeCell.exerciseId, rowId: next.id, field: 'weight' } : null);
  };
  return <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Minimizar entrenamiento"><Ionicons name="chevron-down" size={26} color="#FFF" /></Pressable>
      <SessionTimer startedAt={startedAt} />
      <Pressable onPress={() => void save()} disabled={saving} style={styles.finish}><Text style={styles.finishText}>{saving ? 'GUARDANDO' : 'TERMINAR'}</Text></Pressable>
    </View>
    {!ready ? <ActivityIndicator style={{ flex: 1 }} color="#CCFF00" /> : <>
      <View style={styles.carousel}>{exercises.map((exercise, index) => <Pressable key={exercise.id} onPress={() => { setActiveIndex(index); setActiveCell(null); }} style={[styles.avatar, index === activeIndex && styles.avatarActive]}>
        <Ionicons name={exercise.rows.every((row) => row.completed) ? 'checkmark' : 'barbell'} size={19} color={exercise.rows.every((row) => row.completed) ? '#101114' : '#CCFF00'} />
      </Pressable>)}</View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {active ? <>
          {active.details?.gifUrl ? <Image source={{ uri: active.details.gifUrl }} style={styles.media} resizeMode="contain" accessibilityLabel={`Demostracion de ${active.exercise_id}`} /> : null}
          <Text style={styles.title}>{active.exercise_id}</Text>
          {active.details?.instructions ? <Text style={styles.instructions} numberOfLines={3}>{active.details.instructions}</Text> : null}
          {active.lastPerformance ? <Text style={styles.previous}>ULTIMA VEZ  {active.lastPerformance.sets.map((set) => `${set.weight} KG x ${set.reps}`).join('  ·  ')}</Text> : <Text style={styles.previous}>PRIMER REGISTRO</Text>}
          {active.suggestion ? <Text style={styles.suggestion}>↑ SUGERENCIA: {active.suggestion.weight} KG × {active.suggestion.reps} · {active.suggestion.reason}</Text> : null}
          <Pressable onPress={() => setRestEditorOpen(true)} style={styles.restEdit} accessibilityLabel="Editar tiempo de descanso">
            <Ionicons name="timer-outline" size={17} color="#CCFF00" />
            <Text style={styles.addText}>Descanso: {active.rest_seconds ?? 90} s</Text>
            <Ionicons name="chevron-forward" size={15} color="#A8ABB0" />
          </Pressable>
          <View style={styles.tableHeader}><Text style={styles.colSmall}>SERIE</Text><Text style={styles.col}>KG</Text><Text style={styles.col}>REPES</Text><Text style={styles.colSmall}>OK</Text></View>
          {active.rows.map((row, index) => <View key={row.id} style={[styles.row, row.completed && styles.rowDone]}>
            <Pressable style={styles.colSmall} onPress={() => setTypeTarget({ exerciseId: active.id, rowId: row.id })}><Text style={[styles.setLabel, row.kind === 'warmup' && { color: '#FF9F0A' }]}>{row.kind === 'warmup' ? 'W' : index + 1}</Text></Pressable>
            <TextInput style={[styles.input, activeCell?.rowId === row.id && activeCell.field === 'weight' && styles.inputActive]} showSoftInputOnFocus={false} keyboardType="decimal-pad" value={row.weight} placeholder={String(active.lastPerformance?.sets[index]?.weight ?? '')} placeholderTextColor="#777" onFocus={() => setActiveCell({ exerciseId: active.id, rowId: row.id, field: 'weight' })} onChangeText={(weight) => updateRow(active.id, row.id, { weight })} />
            <TextInput style={[styles.input, activeCell?.rowId === row.id && activeCell.field === 'reps' && styles.inputActive]} showSoftInputOnFocus={false} keyboardType="number-pad" value={row.reps} placeholder={String(active.lastPerformance?.sets[index]?.reps ?? active.reps)} placeholderTextColor="#777" onFocus={() => setActiveCell({ exerciseId: active.id, rowId: row.id, field: 'reps' })} onChangeText={(reps) => updateRow(active.id, row.id, { reps })} />
            <Pressable style={[styles.check, row.completed && styles.checkDone]} onPress={() => completeRow(active, row)} accessibilityLabel={row.completed ? 'Desmarcar serie' : 'Completar serie'}><Ionicons name="checkmark" size={19} color={row.completed ? '#101114' : '#777'} /></Pressable>
          </View>)}
          <Pressable onPress={() => setExercises((current) => current.map((exercise) => exercise.id === active.id ? { ...exercise, rows: [...exercise.rows, { id: `${exercise.id}-${Date.now()}`, weight: '', reps: String(exercise.reps), kind: 'normal', completed: false }] } : exercise))} style={styles.add}><Ionicons name="add" size={18} color="#CCFF00" /><Text style={styles.addText}>Añadir serie</Text></Pressable>
          <Pressable onPress={() => navigation.navigate('ExerciseProgress', { name: active.exercise_id })} style={styles.history}><Ionicons name="stats-chart-outline" size={16} color="#CCFF00" /><Text style={styles.addText}>Ver progreso</Text></Pressable>
        </> : <Text style={styles.instructions}>Esta rutina no tiene ejercicios.</Text>}
      </ScrollView>
      {activeCell && currentRow ? <NumericKeypad field={activeCell.field} value={currentRow[activeCell.field]} onChange={(value) => updateRow(activeCell.exerciseId, activeCell.rowId, { [activeCell.field]: value })} onNext={nextCell} onClose={() => setActiveCell(null)} /> : null}
      <RestTimerBar endAt={restEndAt} onChange={setRestEndAt} onFinish={finishRest} />
    </>}
    <SetTypeSheet visible={typeTarget !== null} onClose={() => setTypeTarget(null)} onSelect={(kind) => { if (typeTarget) updateRow(typeTarget.exerciseId, typeTarget.rowId, { kind }); setTypeTarget(null); }} />
    <Modal visible={restEditorOpen && Boolean(active)} transparent animationType="slide" onRequestClose={() => setRestEditorOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setRestEditorOpen(false)}>
        <Pressable style={styles.restSheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.restTitle}>DESCANSO ENTRE SERIES</Text>
          <Text style={styles.restValue}>{active?.rest_seconds ?? 90} s</Text>
          <View style={styles.restControls}>
            <Pressable style={styles.restStep} onPress={() => setExercises((current) => current.map((exercise) => exercise.id === active?.id ? { ...exercise, rest_seconds: Math.max(0, (exercise.rest_seconds ?? 90) - 15) } : exercise))} accessibilityLabel="Restar 15 segundos"><Ionicons name="remove" size={23} color="#FFF" /></Pressable>
            <Pressable style={styles.restStep} onPress={() => setExercises((current) => current.map((exercise) => exercise.id === active?.id ? { ...exercise, rest_seconds: Math.min(600, (exercise.rest_seconds ?? 90) + 15) } : exercise))} accessibilityLabel="Sumar 15 segundos"><Ionicons name="add" size={23} color="#FFF" /></Pressable>
          </View>
          <Pressable style={styles.restDone} onPress={() => setRestEditorOpen(false)}><Text style={styles.finishText}>LISTO</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#101114' },
  header: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#2B2E35' },
  finish: { backgroundColor: '#CCFF00', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 9 },
  finishText: { color: '#101114', fontWeight: '900', fontSize: 12 },
  carousel: { flexDirection: 'row', gap: 12, padding: 14, minHeight: 72, borderBottomWidth: 1, borderBottomColor: '#2B2E35' },
  avatar: { height: 43, width: 43, borderRadius: 22, borderWidth: 1, borderColor: '#4C5057', alignItems: 'center', justifyContent: 'center' },
  avatarActive: { borderColor: '#CCFF00', borderWidth: 2 },
  content: { padding: 18, paddingBottom: 42 },
  media: { width: '100%', height: 190, marginBottom: 16, backgroundColor: '#1C1F23' },
  title: { color: '#FFF', fontSize: 23, fontWeight: '900', marginBottom: 8 },
  instructions: { color: '#A8ABB0', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  previous: { color: '#A8ABB0', fontSize: 11, fontWeight: '700', marginVertical: 18 },
  suggestion: { color: '#CCFF00', fontSize: 11, fontWeight: '700', lineHeight: 16, marginBottom: 14 },
  restEdit: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 12, marginBottom: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000A' },
  restSheet: { backgroundColor: '#1C1F23', borderTopWidth: 1, borderColor: '#3A3D43', padding: 24, paddingBottom: 36, gap: 18 },
  restTitle: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  restValue: { color: '#CCFF00', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  restControls: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  restStep: { width: 64, height: 52, backgroundColor: '#2B2E35', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  restDone: { backgroundColor: '#CCFF00', padding: 14, borderRadius: 4, alignItems: 'center' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  colSmall: { width: '15%', alignItems: 'center', color: '#A8ABB0', textAlign: 'center', fontSize: 10, fontWeight: '900' },
  col: { width: '31%', color: '#A8ABB0', textAlign: 'center', fontSize: 10, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 55, backgroundColor: '#1C1F23', borderRadius: 4, marginBottom: 6, paddingHorizontal: 4 },
  rowDone: { backgroundColor: '#26321A' },
  setLabel: { color: '#CCFF00', fontSize: 15, fontWeight: '900' },
  input: { width: '31%', height: 42, backgroundColor: '#101114', borderRadius: 4, color: '#FFF', textAlign: 'center', fontSize: 17, fontWeight: '700' },
  inputActive: { borderWidth: 1, borderColor: '#CCFF00' },
  check: { width: 34, height: 34, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2B2E35' },
  checkDone: { backgroundColor: '#CCFF00' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 12 },
  history: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  addText: { color: '#CCFF00', fontSize: 13, fontWeight: '800' },
});
