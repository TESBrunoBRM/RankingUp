import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StrengthLevelBadge } from '../components/StrengthLevelBadge';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, SocialProfileResponse } from '../types';
import { getErrorMessage } from '../utils/errors';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'PublicProfile'>;
type ScreenRoute = RouteProp<AppStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { profileId } = useRoute<ScreenRoute>().params;
  const [data, setData] = useState<SocialProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setData(await rankingUpApiClient.getPublicProfile(profileId));
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo cargar el perfil.'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleFollow = async () => {
    if (!data) return;
    try {
      setActionLoading(true);
      if (data.isFollowing) await rankingUpApiClient.unfollowProfile(profileId);
      else await rankingUpApiClient.followProfile(profileId);
      await load();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo actualizar el seguimiento.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#FFFFFF" /></Pressable>
        <Text style={styles.headerTitle}>{data ? `@${data.profile.username}` : 'PERFIL'}</Text>
        <View style={styles.iconButton} />
      </View>

      {loading && !data ? <View style={styles.center}><ActivityIndicator size="large" color="#CCFF00" /></View> : errorMessage && !data ? (
        <View style={styles.center}><Ionicons name="warning-outline" size={38} color="#FFB020" /><Text style={styles.error}>{errorMessage}</Text><Pressable style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>REINTENTAR</Text></Pressable></View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{data.profile.name.charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.name}>{data.profile.name}</Text>
            <Text style={styles.username}>@{data.profile.username}</Text>
            {data.profile.bio ? <Text style={styles.bio}>{data.profile.bio}</Text> : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statValue}>{data.stats.workouts}</Text><Text style={styles.statLabel}>SESIONES</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data.stats.followers}</Text><Text style={styles.statLabel}>SEGUIDORES</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data.stats.following}</Text><Text style={styles.statLabel}>SIGUIENDO</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data.profile.xp}</Text><Text style={styles.statLabel}>XP</Text></View>
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.followButton, data.isFollowing && styles.followingButton]} disabled={actionLoading} onPress={() => void toggleFollow()}>
              {actionLoading ? <ActivityIndicator color={data.isFollowing ? '#FFFFFF' : '#121212'} /> : <Text style={[styles.followText, data.isFollowing && styles.followingText]}>{data.isFollowing ? 'SIGUIENDO' : 'SEGUIR'}</Text>}
            </Pressable>
            <Pressable style={styles.compareButton} onPress={() => navigation.navigate('ProfileComparison', { profileId })}>
              <Ionicons name="git-compare-outline" size={18} color="#CCFF00" /><Text style={styles.compareText}>COMPARAR</Text>
            </Pressable>
          </View>

          {errorMessage ? <Text style={styles.inlineError}>{errorMessage}</Text> : null}
          <Text style={styles.sectionTitle}>MARCAS DE FUERZA</Text>
          {data.strengths.length ? data.strengths.map((strength) => (
            <View key={strength.exerciseName} style={styles.strengthRow}>
              <View style={styles.strengthCopy}><Text style={styles.strengthName}>{strength.exerciseName}</Text><Text style={styles.strengthMeta}>1RM {strength.estimatedOneRepMax} kg · {strength.bodyweightRatio}x</Text></View>
              <StrengthLevelBadge level={strength.level} />
            </View>
          )) : <View style={styles.empty}><Ionicons name="barbell-outline" size={32} color="#444444" /><Text style={styles.emptyText}>Todavia no hay marcas comparables.</Text></View>}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#242424' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  content: { padding: 20, paddingBottom: 50 },
  identity: { alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#CCFF00', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#121212', fontSize: 38, fontWeight: '900' },
  name: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 12 },
  username: { color: '#CCFF00', fontSize: 13, fontWeight: '800', marginTop: 3 },
  bio: { color: '#A0A0A0', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 10, maxWidth: 300 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2A2A2A', paddingVertical: 16, marginTop: 22 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  statLabel: { color: '#777777', fontSize: 8, fontWeight: '900', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  followButton: { flex: 1, height: 46, borderRadius: 8, backgroundColor: '#CCFF00', alignItems: 'center', justifyContent: 'center' },
  followingButton: { backgroundColor: '#242424', borderWidth: 1, borderColor: '#444444' },
  followText: { color: '#121212', fontSize: 12, fontWeight: '900' },
  followingText: { color: '#FFFFFF' },
  compareButton: { flex: 1, height: 46, borderRadius: 8, borderWidth: 1, borderColor: '#CCFF00', flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  compareText: { color: '#CCFF00', fontSize: 12, fontWeight: '900' },
  inlineError: { color: '#FFB020', fontSize: 11, marginTop: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 28, marginBottom: 8 },
  strengthRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#292929', paddingVertical: 12, gap: 12 },
  strengthCopy: { flex: 1 },
  strengthName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  strengthMeta: { color: '#777777', fontSize: 11, marginTop: 5 },
  empty: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#777777', fontSize: 12, marginTop: 9 },
  error: { color: '#E3E3E3', textAlign: 'center', lineHeight: 19, marginTop: 12 },
  retry: { height: 42, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#CCFF00', justifyContent: 'center', marginTop: 18 },
  retryText: { color: '#121212', fontSize: 11, fontWeight: '900' },
});
