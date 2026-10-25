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
      <Ionicons name="shield-checkmark-outline" color={theme.muted} size={18} />
      <Text style={styles.title}>{kind === 'training' ? 'Seguridad del entrenamiento' : 'Sobre estas estimaciones'}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} color={theme.muted} size={18} />
    </Pressable>
    {expanded ? <Text style={styles.text}>{kind === 'training' ? TRAINING_SAFETY : NUTRITION_SAFETY}</Text> : null}
  </View>;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  card: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 8 },
  title: { flex: 1, color: theme.muted, fontSize: 13, fontWeight: '600' },
  text: { color: theme.muted, fontSize: 14, lineHeight: 22, paddingBottom: 12, paddingTop: 4 },
});
