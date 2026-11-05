import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Exercise } from '../types';
import { useThemePalette } from '../theme';
import { ExerciseMedia } from './ExerciseMedia';

export function ExerciseReference({ name, exercise }: { name: string; exercise?: Exercise }) {
  const theme = useThemePalette();
  const steps = exercise?.steps?.filter(step => step.trim()) ?? [];
  const guide = steps.length ? steps : ((exercise?.instructions ?? '').match(/[^.!?]+[.!?]*/g) ?? []).map(step => step.trim()).filter(Boolean);
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
    <View style={styles.heading}>
      <Ionicons name="body-outline" size={22} color={theme.accent} />
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>GUÍA DE TÉCNICA</Text>
    </View>
    {exercise?.equipment ? <Text style={[styles.meta, { color: theme.muted }]}>Equipo: {exercise.equipment} · Zona: {exercise.muscle}</Text> : null}
    {exercise?.gifUrl || exercise?.thumbnailUrl ? <>
      <ExerciseMedia name={name} gifUrl={exercise.gifUrl} thumbnailUrl={exercise.thumbnailUrl} style={styles.media} />
      {exercise.attribution ? <Text style={[styles.credit, { color: theme.muted }]}>{exercise.attribution}</Text> : null}
    </> : null}
    {guide.length ? <>
      <Text style={[styles.subtitle, { color: theme.text }]}>Cómo realizarlo</Text>
      {guide.map((step, index) => <View key={`${index}:${step}`} style={styles.step}>
        <Text style={[styles.number, { color: theme.accent }]}>{index + 1}</Text>
        <Text style={[styles.body, { color: theme.text }]}>{step}</Text>
      </View>)}
    </> : <Text style={[styles.body, { color: theme.muted }]}>No hay una guía verificada para este ejercicio. Vuelve a buscarla o elige un ejercicio con instrucciones que puedas seguir.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontWeight: '800', fontSize: 14, flex: 1 },
  meta: { fontSize: 13, lineHeight: 19 },
  subtitle: { fontWeight: '700', fontSize: 15 },
  media: { height: 210, width: '100%' },
  credit: { fontSize: 11, lineHeight: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  number: { fontSize: 16, fontWeight: '900', minWidth: 20 },
  body: { flexShrink: 1, fontSize: 15, lineHeight: 23 },
});
