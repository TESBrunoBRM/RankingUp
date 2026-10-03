import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function NumericKeypad({ field, value, onChange, onNext, onClose }: {
  field: 'weight' | 'reps'; value: string; onChange: (value: string) => void;
  onNext: () => void; onClose: () => void;
}) {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const append = (digit: string) => {
    if (digit === '.' && (field === 'reps' || value.includes('.'))) return;
    const next = value === '0' && digit !== '.' ? digit : value + digit;
    if (next.length <= 6) onChange(next);
  };
  const adjust = (delta: number) => {
    const current = Number(value.replace(',', '.')) || 0;
    onChange(String(Math.max(0, Math.round((current + delta) * 100) / 100)));
  };
  return <View style={styles.panel}>
    <View style={styles.help}><Text style={styles.helpText}>{field === 'weight' ? 'Registra el peso total, incluida la barra' : 'Registra las repeticiones completadas'}</Text><Pressable onPress={onClose} accessibilityLabel="Cerrar teclado"><Ionicons name="chevron-down" color={theme.accent} size={20} /></Pressable></View>
    <View style={styles.adjustRow}>
      <Pressable style={styles.adjust} onPress={() => adjust(field === 'weight' ? -2.5 : -1)}><Text style={styles.adjustText}>{field === 'weight' ? '-2.5' : '-1'}</Text></Pressable>
      <Pressable style={styles.adjust} onPress={() => adjust(field === 'weight' ? 2.5 : 1)}><Text style={styles.adjustText}>{field === 'weight' ? '+2.5' : '+1'}</Text></Pressable>
    </View>
    <View style={styles.keys}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', field === 'weight' ? '.' : '', '0', 'back'].map((digit, index) => <Pressable key={`${index}-${digit}`} style={styles.key} disabled={!digit} onPress={() => digit === 'back' ? onChange(value.slice(0, -1)) : append(digit)}>
        {digit === 'back' ? <Ionicons name="backspace-outline" color={theme.text} size={21} /> : <Text style={styles.keyText}>{digit}</Text>}
      </Pressable>)}
    </View>
    <Pressable style={styles.next} onPress={onNext}><Text style={styles.nextText}>SIGUIENTE</Text><Ionicons name="arrow-forward" color="#101114" size={18} /></Pressable>
  </View>;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  panel: { backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },
  help: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, helpText: { color: theme.accent, fontSize: 11, fontWeight: '700', flex: 1 },
  adjustRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 }, adjust: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 30, borderRadius: 4, backgroundColor: theme.surface },
  adjustText: { color: theme.accent, fontWeight: '800', fontSize: 13 }, keys: { flexDirection: 'row', flexWrap: 'wrap' }, key: { width: '33.33%', height: 39, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: theme.text, fontWeight: '700', fontSize: 19 }, next: { height: 36, backgroundColor: theme.accentFill, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  nextText: { color: '#101114', fontWeight: '900', fontSize: 12 },
});
