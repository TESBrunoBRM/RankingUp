import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeMessage } from '../types';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';

export function HomeMessageCarousel({ messages, loading = false }: { messages: HomeMessage[]; loading?: boolean }) {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const focused = useIsFocused();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [screenReader, setScreenReader] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => undefined);
    void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (active) setScreenReader(value); }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => { active = false; motion.remove(); reader.remove(); };
  }, []);
  useEffect(() => {
    if (!focused || paused || reduceMotion || screenReader || messages.length < 2) return;
    const timer = setInterval(() => setIndex(current => (current + 1) % messages.length), 9000);
    return () => clearInterval(timer);
  }, [focused, paused, reduceMotion, screenReader, messages.length]);
  const position = index % Math.max(messages.length, 1);
  const message = messages[position];
  const move = (offset: number) => { setPaused(true); setIndex((position + offset + messages.length) % messages.length); };
  return <View style={styles.card}>
    <View style={styles.heading}>
      <View style={styles.labelRow}>
        <Ionicons name={message?.kind === 'sabias-que' ? 'bulb-outline' : 'sparkles-outline'} size={17} color={theme.accent} />
        <Text style={styles.label}>{message?.kind === 'sabias-que' ? 'PARA APRENDER' : 'A TU RITMO'}</Text>
      </View>
      {messages.length > 1 ? <Text style={styles.counter}>{position + 1} / {messages.length}</Text> : null}
    </View>
    {loading && !message ? <ActivityIndicator style={styles.loading} color={theme.accent} />
      : <Text style={styles.message}>{message?.text || 'Cada paso cuenta. El descanso también forma parte de tu progreso.'}</Text>}
    {messages.length > 1 ? <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mensaje anterior" onPress={() => move(-1)} style={styles.arrow}>
        <Ionicons name="chevron-back" size={21} color={theme.text} />
      </Pressable>
      {reduceMotion || screenReader ? <Text style={styles.controlText}>Lectura manual</Text> : <Pressable accessibilityRole="button" accessibilityLabel={paused ? 'Reanudar mensajes automáticos' : 'Pausar mensajes automáticos'}
        onPress={() => setPaused(value => !value)} style={styles.pause}>
        <Text style={styles.controlText}>{reduceMotion || screenReader ? 'Lectura manual' : paused ? 'Reanudar' : 'Pausar'}</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Mensaje siguiente" onPress={() => move(1)} style={styles.arrow}>
        <Ionicons name="chevron-forward" size={21} color={theme.text} />
      </Pressable>
    </View> : null}
  </View>;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  card: { marginHorizontal: 20, marginVertical: 16, padding: 20, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: theme.accent },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  label: { color: theme.accent, fontSize: 11, letterSpacing: 1.2, fontWeight: '800', flexShrink: 1 },
  counter: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  message: { color: theme.text, fontSize: 21, lineHeight: 30, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  loading: { marginVertical: 24 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: theme.surfaceAlt },
  pause: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  controlText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
});
