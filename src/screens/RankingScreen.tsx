import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Body, { ExtendedBodyPart } from 'react-native-body-highlighter';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { useAuthStore } from '../store/authStore';
import type { Profile, RankInfo, RankProgressResponse } from '../types';
import { getErrorMessage } from '../utils/errors';

type RankIconName =
  | 'hammer-outline'
  | 'shield-half-outline'
  | 'medal-outline'
  | 'trophy-outline'
  | 'sparkles-outline'
  | 'diamond-outline'
  | 'ribbon-outline';

const getRankColor = (name: string): string => {
  const normalized = name.toUpperCase();
  if (normalized.includes('HIERRO')) return '#9AA3AD';
  if (normalized.includes('BRONCE')) return '#CD7F32';
  if (normalized.includes('PLATA')) return '#D9E0E7';
  if (normalized.includes('ORO')) return '#FFD84D';
  if (normalized.includes('PLATINO')) return '#39A0ED';
  if (normalized.includes('DIAMANTE')) return '#6FE7F5';
  return '#CCFF00';
};

const getRankIcon = (name: string): RankIconName => {
  const normalized = name.toUpperCase();
  if (normalized.includes('HIERRO')) return 'hammer-outline';
  if (normalized.includes('BRONCE')) return 'shield-half-outline';
  if (normalized.includes('PLATA')) return 'medal-outline';
  if (normalized.includes('ORO')) return 'trophy-outline';
  if (normalized.includes('PLATINO')) return 'sparkles-outline';
  if (normalized.includes('DIAMANTE')) return 'diamond-outline';
  return 'ribbon-outline';
};

interface RankEmblemProps {
  rankName: string;
  color: string;
  compact?: boolean;
}

function RankEmblem({ rankName, color, compact = false }: RankEmblemProps) {
  const size = compact ? 26 : 54;
  const imageSize = compact ? 38 : 84;
  const normalized = rankName.toUpperCase();

  if (normalized.includes('HIERRO')) {
    return <Image source={require('../../assets/images/hierro.png')} style={{ width: imageSize, height: imageSize }} resizeMode="contain" />;
  }

  if (normalized.includes('BRONCE')) {
    return <Image source={require('../../assets/images/bronce.png')} style={{ width: imageSize, height: imageSize }} resizeMode="contain" />;
  }

  return (
    <View style={[styles.vectorEmblem, compact && styles.vectorEmblemCompact, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Ionicons name={getRankIcon(rankName)} size={size} color={color} />
    </View>
  );
}

export default function RankingScreen() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xp, setXp] = useState(0);
  const [ranks, setRanks] = useState<RankInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [rankProgress, setRankProgress] = useState<RankProgressResponse | null>(null);
  const [muscleData, setMuscleData] = useState<ExtendedBodyPart[]>([]);
  const [isFront, setIsFront] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRanking = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const ranking = await rankingUpApiClient.getRanking();
      setProfile(ranking.profile);
      setXp(ranking.xp ?? 0);
      setRanks(ranking.ranks);
      setLeaderboard(ranking.leaderboard);
      setRankProgress(ranking.progress);
      setMuscleData(ranking.muscleData as ExtendedBodyPart[]);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo cargar tu ranking.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void loadRanking();
  }, [loadRanking]));

  const fallbackRank = useMemo(() => ({
    id: 0,
    name: 'Sin rango',
    min_xp: 0,
    max_xp: null,
    color: '#CCFF00',
  }), []);
  const currentRank = rankProgress?.currentRank ?? fallbackRank;
  const rankColor = currentRank.color || getRankColor(currentRank.name);
  const progressPercent = Math.max(0, Math.min(100, rankProgress?.progressPercent ?? 0));
  const nextLevelXp = rankProgress?.nextLevelXp;

  if (loading && !rankProgress) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PROGRESO GLOBAL</Text>
            <Text style={styles.mainTitle}>RANGOS</Text>
          </View>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#CCFF00" />
          <Text style={styles.stateText}>Cargando progreso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !rankProgress) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PROGRESO GLOBAL</Text>
            <Text style={styles.mainTitle}>RANGOS</Text>
          </View>
        </View>
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons name="cloud-offline-outline" size={34} color="#FF9F0A" />
          </View>
          <Text style={styles.errorTitle}>SIN CONEXION CON LA API</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadRanking()}>
            <Ionicons name="refresh" size={18} color="#111" />
            <Text style={styles.retryButtonText}>REINTENTAR</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PROGRESO GLOBAL</Text>
          <Text style={styles.mainTitle}>RANGOS</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={() => void loadRanking()} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#CCFF00" />
            : <Ionicons name="refresh" size={20} color="#CCFF00" />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {errorMessage ? (
          <View style={styles.inlineNotice}>
            <Ionicons name="warning-outline" size={18} color="#FF9F0A" />
            <Text style={styles.inlineNoticeText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={[styles.rankHero, { borderColor: rankColor }]}>
          <RankEmblem rankName={currentRank.name} color={rankColor} />
          <View style={styles.rankHeroContent}>
            <Text style={styles.currentLabel}>RANGO ACTUAL</Text>
            <Text style={[styles.rankName, { color: rankColor }]}>{currentRank.name.toUpperCase()}</Text>
            <Text style={styles.totalXp}>{xp.toLocaleString()} XP</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionLabel}>PROGRESO DEL NIVEL</Text>
            <Text style={[styles.progressValue, { color: rankColor }]}>{Math.round(progressPercent)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: rankColor }]} />
          </View>
          <Text style={styles.progressCaption}>
            {rankProgress?.isMaxLevel
              ? 'Alcanzaste el rango maximo.'
              : `${(nextLevelXp ?? 0).toLocaleString()} XP para avanzar`}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RUTA DE RANGOS</Text>
          <Text style={styles.sectionMeta}>{ranks.length} NIVELES</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankPath}>
          {ranks.map((rank) => {
            const color = getRankColor(rank.name);
            const isCurrent = rank.id === currentRank.id;
            const isUnlocked = xp >= rank.min_xp;
            return (
              <View key={rank.id} style={[styles.rankStep, isCurrent && { borderColor: color }]}>
                <View style={[styles.rankStepIcon, isUnlocked && { backgroundColor: `${color}18`, borderColor: color }]}>
                  <Ionicons name={getRankIcon(rank.name)} size={22} color={isUnlocked ? color : '#555B66'} />
                </View>
                <Text style={[styles.rankStepName, isCurrent && { color }]} numberOfLines={1}>{rank.name.toUpperCase()}</Text>
                <Text style={styles.rankStepXp}>{rank.min_xp.toLocaleString()} XP</Text>
                {isCurrent ? <Text style={[styles.currentStep, { color }]}>ACTUAL</Text> : null}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>MAPA DE FUERZA</Text>
            <Text style={styles.sectionDescription}>Mejores marcas registradas por grupo muscular</Text>
          </View>
        </View>
        <View style={styles.segmentControl}>
          <Pressable style={[styles.segmentButton, isFront && styles.segmentButtonActive]} onPress={() => setIsFront(true)}>
            <Text style={[styles.segmentText, isFront && styles.segmentTextActive]}>FRENTE</Text>
          </Pressable>
          <Pressable style={[styles.segmentButton, !isFront && styles.segmentButtonActive]} onPress={() => setIsFront(false)}>
            <Text style={[styles.segmentText, !isFront && styles.segmentTextActive]}>ESPALDA</Text>
          </Pressable>
        </View>
        <View style={styles.bodyViewport}>
          {muscleData.length > 0 ? (
            <Body data={muscleData} scale={0.9} side={isFront ? 'front' : 'back'} />
          ) : (
            <View style={styles.bodyEmpty}>
              <Ionicons name="body-outline" size={42} color="#555B66" />
              <Text style={styles.bodyEmptyTitle}>SIN MARCAS TODAVIA</Text>
              <Text style={styles.bodyEmptyText}>Registra entrenamientos con peso para activar este mapa.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CLASIFICACION GLOBAL</Text>
          <Text style={styles.sectionMeta}>TOP {leaderboard.length}</Text>
        </View>
        <View style={styles.leaderboardList}>
          {leaderboard.length === 0 ? (
            <View style={styles.leaderboardEmpty}>
              <Ionicons name="podium-outline" size={32} color="#555B66" />
              <Text style={styles.bodyEmptyText}>Aun no hay atletas en la clasificacion.</Text>
            </View>
          ) : leaderboard.map((athlete, index) => {
            const isMe = athlete.id === user?.id;
            const isPodium = index < 3;
            return (
              <View key={athlete.id} style={[styles.leaderboardRow, isMe && styles.leaderboardRowMe]}>
                <View style={[styles.positionBadge, isPodium && styles.positionBadgePodium]}>
                  {isPodium
                    ? <Ionicons name={index === 0 ? 'trophy' : 'medal'} size={17} color={index === 0 ? '#FFD84D' : index === 1 ? '#D9E0E7' : '#CD7F32'} />
                    : <Text style={styles.positionText}>{index + 1}</Text>}
                </View>
                <View style={styles.athleteContent}>
                  <Text style={[styles.athleteName, isMe && styles.athleteNameMe]} numberOfLines={1}>
                    {isMe ? 'TU' : athlete.name || `Atleta ${athlete.id.slice(0, 4)}`}
                  </Text>
                  {isMe ? <Text style={styles.youLabel}>TU POSICION</Text> : null}
                </View>
                <Text style={styles.athleteXp}>{athlete.xp.toLocaleString()} XP</Text>
              </View>
            );
          })}
        </View>

        {profile?.weight ? (
          <Text style={styles.profileNote}>Perfil de fuerza calculado con peso corporal de {profile.weight} kg.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { minHeight: 82, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#24262B' },
  eyebrow: { color: '#7E8792', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
  mainTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 0 },
  refreshButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B1D22', borderWidth: 1, borderColor: '#30333A' },
  content: { padding: 20, paddingBottom: 110 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  stateText: { color: '#8D96A1', fontSize: 13, marginTop: 14 },
  errorIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,159,10,0.1)', marginBottom: 16 },
  errorTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  errorText: { color: '#9AA3AD', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  retryButton: { minHeight: 44, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#CCFF00' },
  retryButtonText: { color: '#111', fontSize: 12, fontWeight: '900' },
  inlineNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,159,10,0.08)', borderWidth: 1, borderColor: 'rgba(255,159,10,0.25)', marginBottom: 16 },
  inlineNoticeText: { flex: 1, color: '#D7DCE2', fontSize: 12, lineHeight: 17 },
  rankHero: { minHeight: 120, flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, marginBottom: 18 },
  rankHeroContent: { flex: 1 },
  currentLabel: { color: '#7E8792', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  rankName: { fontSize: 26, fontWeight: '900', letterSpacing: 0, marginBottom: 4 },
  totalXp: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  vectorEmblem: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  vectorEmblemCompact: { width: 38, height: 38, borderRadius: 19, borderWidth: 1 },
  progressBlock: { marginBottom: 30 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { color: '#C5CBD2', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  progressValue: { fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#24272D' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressCaption: { color: '#7E8792', fontSize: 11, marginTop: 8, textAlign: 'right' },
  sectionHeader: { minHeight: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0 },
  sectionDescription: { color: '#7E8792', fontSize: 11, marginTop: 4 },
  sectionMeta: { color: '#7E8792', fontSize: 10, fontWeight: '800' },
  rankPath: { gap: 10, paddingBottom: 26 },
  rankStep: { width: 112, minHeight: 132, padding: 12, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#2B2E35' },
  rankStepIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30343B', marginBottom: 10 },
  rankStepName: { color: '#C5CBD2', fontSize: 11, fontWeight: '900', marginBottom: 4 },
  rankStepXp: { color: '#707984', fontSize: 9, fontWeight: '700' },
  currentStep: { fontSize: 9, fontWeight: '900', marginTop: 9 },
  segmentControl: { alignSelf: 'center', width: 230, flexDirection: 'row', padding: 3, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#2B2E35', marginBottom: 8 },
  segmentButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentButtonActive: { backgroundColor: '#CCFF00' },
  segmentText: { color: '#7E8792', fontSize: 11, fontWeight: '900' },
  segmentTextActive: { color: '#111' },
  bodyViewport: { height: 340, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  bodyEmpty: { alignItems: 'center', maxWidth: 260 },
  bodyEmptyTitle: { color: '#C5CBD2', fontSize: 12, fontWeight: '900', marginTop: 12, marginBottom: 6 },
  bodyEmptyText: { color: '#707984', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  leaderboardList: { gap: 8, marginBottom: 20 },
  leaderboardRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#292C32' },
  leaderboardRowMe: { borderColor: '#CCFF00', backgroundColor: 'rgba(204,255,0,0.05)' },
  positionBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#24272D', marginRight: 11 },
  positionBadgePodium: { backgroundColor: '#292B31' },
  positionText: { color: '#9AA3AD', fontSize: 12, fontWeight: '900' },
  athleteContent: { flex: 1, minWidth: 0 },
  athleteName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  athleteNameMe: { color: '#CCFF00' },
  youLabel: { color: '#7E8792', fontSize: 8, fontWeight: '900', marginTop: 2 },
  athleteXp: { color: '#C5CBD2', fontSize: 12, fontWeight: '900', marginLeft: 10 },
  leaderboardEmpty: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#292C32', borderStyle: 'dashed', borderRadius: 8 },
  profileNote: { color: '#616A75', fontSize: 10, textAlign: 'center', marginTop: 4 },
});
