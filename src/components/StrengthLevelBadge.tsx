import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StrengthLevelName } from '../types';

const LEVEL_LABELS: Record<StrengthLevelName, string> = {
  'sin-clasificar': 'SIN CLASIFICAR',
  principiante: 'PRINCIPIANTE',
  novato: 'NOVATO',
  intermedio: 'INTERMEDIO',
  avanzado: 'AVANZADO',
  elite: 'ELITE',
};

const LEVEL_COLORS: Record<StrengthLevelName, string> = {
  'sin-clasificar': '#777777',
  principiante: '#8D9AA5',
  novato: '#4EA8DE',
  intermedio: '#CCFF00',
  avanzado: '#FFB020',
  elite: '#FF4D6D',
};

interface StrengthLevelBadgeProps {
  level: StrengthLevelName;
}

export function StrengthLevelBadge({ level }: StrengthLevelBadgeProps) {
  const color = LEVEL_COLORS[level];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.label, { color }]}>{LEVEL_LABELS[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
  },
});

