import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StreakBadgeProps {
  count: number;
  onPress: () => void;
}

export const StreakBadge = React.memo(function StreakBadge({ count, onPress }: StreakBadgeProps) {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const color = count > 0 ? (theme.mode === 'light' ? '#9A4A00' : '#FF9F0A') : theme.muted;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Racha de ${count} dias. Ver calendario`}
      style={styles.badge} onPress={onPress}>
      <Ionicons name="flame" size={18} color={color} />
      <Text style={[styles.value, { color }]}>{count}</Text>
    </Pressable>
  );
});

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  badge: { minWidth: 55, height: 44, borderRadius: 8, flexDirection: 'row', gap: 5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border },
  value: { fontSize: 15, fontWeight: '900' },
});
