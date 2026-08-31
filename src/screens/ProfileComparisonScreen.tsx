import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StrengthLevelBadge } from '../components/StrengthLevelBadge';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, ProfileComparisonResponse } from '../types';
import { getErrorMessage } from '../utils/errors';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'ProfileComparison'>;
type ScreenRoute = RouteProp<AppStackParamList, 'ProfileComparison'>;

export default function ProfileComparisonScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { profileId } = useRoute<ScreenRoute>().params;
  const [data, setData] = useState<ProfileComparisonResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setErrorMessage('');
      setData(await rankingUpApiClient.compareProfile(profileId));
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo crear la comparacion.'));
    }
  }, [profileId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#FFFFFF" /></Pressable>
        <Text style={styles.title}>COMPARACION</Text>
        <View style={styles.iconButton} />
      </View>
      {!data && !errorMessage ? <View style={styles.center}><ActivityIndicator size="large" color="#CCFF00" /></View> : errorMessage ? (
        <View style={styles.center}><Ionicons name="warning-outline" size={36} color="#FFB020" /><Text style={styles.error}>{errorMessage}</Text><Pressable style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>REINTENTAR</Text></Pressable></View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.versusHeader}>
            <View style={styles.person}><View style={styles.avatar}><Text style={styles.avatarText}>{data.viewer.name.charAt(0)}</Text></View><Text style={styles.personName} numberOfLines={1}>{data.viewer.name}</Text><Text style={styles.handle}>@{data.viewer.username}</Text></View>
            <View style={styles.vs}><Text style={styles.vsText}>VS</Text></View>
            <View style={styles.person}><View style={[styles.avatar, styles.otherAvatar]}><Text style={[styles.avatarText, styles.otherAvatarText]}>{data.other.name.charAt(0)}</Text></View><Text style={styles.personName} numberOfLines={1}>{data.other.name}</Text><Text style={styles.handle}>@{data.other.username}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>FUERZA RELATIVA</Text>
          {data.exercises.length ? data.exercises.map((row) => (
            <View key={row.exerciseName} style={styles.comparisonRow}>
              <Text style={styles.exerciseName}>{row.exerciseName}</Text>
              <View style={styles.valuesRow}>
                <View style={[styles.valueSide, row.winner === 'viewer' && styles.winner]}>
                  {row.viewer ? <><StrengthLevelBadge level={row.viewer.level} /><Text style={styles.oneRm}>{row.viewer.estimatedOneRepMax} kg</Text><Text style={styles.ratio}>{row.viewer.bodyweightRatio}x</Text></> : <Text style={styles.noData}>SIN MARCA</Text>}
                </View>
                <View style={[styles.valueSide, row.winner === 'other' && styles.winner]}>
                  {row.other ? <><StrengthLevelBadge level={row.other.level} /><Text style={styles.oneRm}>{row.other.estimatedOneRepMax} kg</Text><Text style={styles.ratio}>{row.other.bodyweightRatio}x</Text></> : <Text style={styles.noData}>SIN MARCA</Text>}
                </View>
              </View>
            </View>
          )) : <View style={styles.empty}><Text style={styles.noData}>AUN NO HAY MARCAS PARA COMPARAR</Text></View>}
          <Text style={styles.footnote}>Niveles calculados con 1RM estimado y relacion con el peso corporal.</Text>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#242424' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  content: { padding: 20, paddingBottom: 50 },
  versusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  person: { flex: 1, alignItems: 'center', minWidth: 0 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CCFF00' },
  otherAvatar: { backgroundColor: '#FFFFFF' },
  avatarText: { color: '#121212', fontSize: 27, fontWeight: '900' },
  otherAvatarText: { color: '#121212' },
  personName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 9, maxWidth: 120 },
  handle: { color: '#777777', fontSize: 10, marginTop: 2 },
  vs: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#444444', alignItems: 'center', justifyContent: 'center' },
  vsText: { color: '#CCFF00', fontSize: 13, fontWeight: '900' },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginBottom: 6 },
  comparisonRow: { borderBottomWidth: 1, borderBottomColor: '#2A2A2A', paddingVertical: 16 },
  exerciseName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  valuesRow: { flexDirection: 'row', gap: 10 },
  valueSide: { flex: 1, minHeight: 82, borderRadius: 8, borderWidth: 1, borderColor: '#333333', alignItems: 'center', justifyContent: 'center', padding: 8 },
  winner: { borderColor: '#CCFF00', backgroundColor: '#1C220F' },
  oneRm: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 7 },
  ratio: { color: '#777777', fontSize: 10, marginTop: 2 },
  noData: { color: '#666666', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  empty: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  footnote: { color: '#666666', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 20 },
  error: { color: '#E3E3E3', textAlign: 'center', marginTop: 12 },
  retry: { height: 42, borderRadius: 8, backgroundColor: '#CCFF00', paddingHorizontal: 20, justifyContent: 'center', marginTop: 18 },
  retryText: { color: '#121212', fontSize: 11, fontWeight: '900' },
});
