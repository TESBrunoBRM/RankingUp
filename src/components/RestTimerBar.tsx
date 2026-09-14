import React, { useEffect, useState } from 'react';
import { Vibration, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function RestTimerBar({ endAt, onChange, onFinish }: {
  endAt: number | null; onChange: (value: number | null) => void; onFinish: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        Vibration.vibrate(200);
        onFinish();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endAt, onFinish]);
  if (endAt === null) return null;
  return <View style={styles.bar}>
    <Ionicons name="moon-outline" size={18} color="#CCFF00" />
    <Text style={styles.label}>Descanso {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</Text>
    <Pressable accessibilityLabel="Restar 15 segundos" onPress={() => onChange(Math.max(Date.now(), endAt - 15000))} style={styles.action}><Text style={styles.actionText}>-15</Text></Pressable>
    <Pressable accessibilityLabel="Sumar 15 segundos" onPress={() => onChange(endAt + 15000)} style={styles.action}><Text style={styles.actionText}>+15</Text></Pressable>
    <Pressable accessibilityLabel="Saltar descanso" onPress={() => onChange(null)} style={styles.action}><Ionicons name="play-skip-forward" size={17} color="#CCFF00" /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  bar: { height: 58, backgroundColor: '#1C1F23', borderTopWidth: 1, borderTopColor: '#2B2E35', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  label: { color: '#FFF', fontSize: 14, fontWeight: '800', flex: 1, fontVariant: ['tabular-nums'] },
  action: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#CCFF00', fontSize: 12, fontWeight: '800' },
});
