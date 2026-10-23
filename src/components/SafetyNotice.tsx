import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NUTRITION_SAFETY, TRAINING_SAFETY } from '../constants/experience';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';

export function SafetyNotice({ kind }: { kind: 'training' | 'nutrition' }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.header}>
      <Ionicons name="shield-checkmark-outline" color={theme.accent} size={22} />
      <Text style={styles.title}>{kind === 'training' ? 'Entrena a tu ritmo y sin dolor' : 'Metas orientativas, no una dieta clínica'}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} color={theme.muted} size={18} />
    </Pressable>
    <Text style={styles.text}>{expanded ? (kind === 'training' ? TRAINING_SAFETY : NUTRITION_SAFETY) : kind === 'training'
      ? 'Detente ante dolor o mareos. Revisa los avisos de seguridad antes de comenzar.'
      : 'Revisa las estimaciones y respeta las indicaciones de tu profesional, también para el agua.'}</Text>
  </View>;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  card: { padding: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  title: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' },
  text: { color: theme.muted, fontSize: 14, lineHeight: 22 },
});
