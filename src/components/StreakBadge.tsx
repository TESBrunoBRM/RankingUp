import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StreakBadgeProps {
  count: number;
  onPress: () => void;
}

export const StreakBadge = React.memo(function StreakBadge({ count, onPress }: StreakBadgeProps) {
  const color = count > 0 ? '#FF9F0A' : '#6D7681';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Racha de ${count} dias. Ver calendario`}
      style={styles.badge} onPress={onPress}>
      <Ionicons name="flame" size={18} color={color} />
      <Text style={[styles.value, { color }]}>{count}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  badge: { minWidth: 55, height: 42, borderRadius: 8, flexDirection: 'row', gap: 5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B1D22',
    borderWidth: 1, borderColor: '#30333A' },
  value: { fontSize: 15, fontWeight: '900' },
});
