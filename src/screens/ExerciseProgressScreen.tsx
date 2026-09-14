import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Polyline } from 'react-native-svg';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList } from '../types';

type Point = { date: string; bestWeight: number; estimatedOneRm: number; volume: number };
export default function ExerciseProgressScreen() {
  const { name } = useRoute<RouteProp<AppStackParamList, 'ExerciseProgress'>>().params;
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    rankingUpApiClient.getExerciseProgress(name).then((result) => { if (active) setPoints(result); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [name]);
  const max = Math.max(1, ...points.map((point) => point.estimatedOneRm));
  const path = points.map((point, index) => `${20 + (index * 280) / Math.max(1, points.length - 1)},${150 - (point.estimatedOneRm / max) * 125}`).join(' ');
  return <SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFF" /></Pressable><Text style={styles.title} numberOfLines={1}>{name}</Text></View>
    {loading ? <ActivityIndicator style={{ flex: 1 }} color="#CCFF00" /> : <ScrollView contentContainerStyle={styles.content}>
      {error ? <Text style={styles.muted}>No se pudo cargar el progreso.</Text> : points.length === 0 ? <Text style={styles.muted}>Aún no tienes registros para este ejercicio.</Text> : <>
        <Text style={styles.subtitle}>1RM ESTIMADO</Text>
        <Svg width="100%" height={170} viewBox="0 0 320 170"><Line x1="20" y1="150" x2="300" y2="150" stroke="#4B5057" strokeWidth="1" /><Polyline points={path} fill="none" stroke="#CCFF00" strokeWidth="3" /></Svg>
        {points.slice().reverse().map((point) => <View key={point.date} style={styles.row}><Text style={styles.date}>{new Date(point.date).toLocaleDateString('es-CL')}</Text><Text style={styles.metric}>{point.bestWeight} kg · 1RM {point.estimatedOneRm} kg</Text></View>)}
      </>}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101114' }, header: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: '#2B2E35' }, title: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1 }, content: { padding: 20 }, subtitle: { color: '#CCFF00', fontSize: 12, fontWeight: '900', marginBottom: 24 }, muted: { color: '#9A9FA6', fontSize: 14 }, row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2B2E35', flexDirection: 'row', justifyContent: 'space-between' }, date: { color: '#9A9FA6', fontSize: 12 }, metric: { color: '#FFF', fontSize: 12, fontWeight: '700' } });
