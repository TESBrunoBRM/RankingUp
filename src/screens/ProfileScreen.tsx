import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StrengthLevelBadge } from '../components/StrengthLevelBadge';
import { ProfileProgressGrid } from '../components/ProfileProgressGrid';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, SocialProfileResponse } from '../types';
import { getErrorMessage } from '../utils/errors';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import { useEnabledFeatures } from '../store/experienceStore';

export default function ProfileScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { training, community } = useEnabledFeatures();
  const [data, setData] = useState<SocialProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'progress' | 'strength'>(community ? 'progress' : 'strength');
  const loadProfile = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setData(await rankingUpApiClient.getOwnProfile());
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar tu perfil.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );
  const profile = data?.profile;
  const showProgress = community && (!training || tab === 'progress');
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.username} numberOfLines={1}>
          {profile?.username ?? 'Tu perfil'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir ajustes"
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="menu-outline" size={29} color={theme.text} />
        </Pressable>
      </View>
      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.retry}
                onPress={() => void loadProfile()}
              >
                <Text style={styles.link}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}
          {data ? (
            <>
              <View style={styles.identity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(profile?.name || 'R').charAt(0).toUpperCase()}
                  </Text>
                </View>
                {training || community ? (
                  <View style={styles.stats}>
                    {training ? (
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{data.stats.workouts}</Text>
                        <Text style={styles.statLabel}>sesiones</Text>
                      </View>
                    ) : null}
                    {community ? (
                      <>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{data.stats.followers}</Text>
                          <Text style={styles.statLabel}>seguidores</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{data.stats.following}</Text>
                          <Text style={styles.statLabel}>siguiendo</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{data.strengths.length}</Text>
                        <Text style={styles.statLabel}>marcas</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.personalSpace}>Tu espacio personal</Text>
                )}
              </View>
              <View style={styles.bioSection}>
                <Text style={styles.name}>{profile?.name}</Text>
                {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
                <View style={styles.metaRow}>
                  {community ? (
                    <>
                      <Ionicons
                        name={profile?.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                        size={13}
                        color={theme.muted}
                      />
                      <Text style={styles.meta}>
                        {profile?.isPublic ? 'Perfil público' : 'Perfil privado'}
                      </Text>
                      <Text style={styles.dot}>·</Text>
                      <Text style={styles.xp}>{profile?.xp ?? 0} XP</Text>
                    </>
                  ) : (
                    <Text style={styles.meta}>RankingUp · A tu ritmo</Text>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Text style={styles.actionText}>Editar perfil</Text>
                </Pressable>
                {community ? (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.action}
                    onPress={() => navigation.navigate('DiscoverProfiles')}
                  >
                    <Ionicons name="person-add-outline" size={17} color={theme.text} />
                    <Text style={styles.actionText}>Buscar atletas</Text>
                  </Pressable>
                ) : null}
              </View>
              {training ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.history}
                  onPress={() => navigation.navigate('WorkoutHistory')}
                >
                  <Ionicons name="time-outline" size={20} color={theme.accent} />
                  <Text style={styles.historyText}>Historial de entrenamientos</Text>
                  <Ionicons name="chevron-forward" size={17} color={theme.muted} />
                </Pressable>
              ) : null}
              {training || community ? (
                <>
                  <View accessibilityRole="tablist" style={styles.tabs}>
                    {community ? (
                      <Pressable
                        accessibilityRole="tab"
                        accessibilityState={{ selected: showProgress }}
                        style={[styles.tab, showProgress && styles.tabActive]}
                        onPress={() => setTab('progress')}
                      >
                        <Ionicons
                          name="grid-outline"
                          size={19}
                          color={showProgress ? theme.text : theme.muted}
                        />
                        <Text style={[styles.tabText, showProgress && styles.tabTextActive]}>
                          Progreso
                        </Text>
                      </Pressable>
                    ) : null}
                    {training ? (
                      <Pressable
                        accessibilityRole="tab"
                        accessibilityState={{ selected: !showProgress }}
                        style={[styles.tab, !showProgress && styles.tabActive]}
                        onPress={() => setTab('strength')}
                      >
                        <Ionicons
                          name="barbell-outline"
                          size={21}
                          color={!showProgress ? theme.text : theme.muted}
                        />
                        <Text style={[styles.tabText, !showProgress && styles.tabTextActive]}>
                          Marcas
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {showProgress ? (
                    <ProfileProgressGrid profileId={data.profile.id} showTitle={false} />
                  ) : data.strengths.length ? (
                    data.strengths.map((strength) => (
                      <View key={strength.exerciseName} style={styles.strengthRow}>
                        <View style={styles.flex}>
                          <Text style={styles.strengthName}>{strength.exerciseName}</Text>
                          <Text style={styles.strengthMeta}>
                            1RM {strength.estimatedOneRepMax} kg · {strength.bodyweightRatio}× tu
                            peso
                          </Text>
                        </View>
                        <StrengthLevelBadge level={strength.level} />
                      </View>
                    ))
                  ) : (
                    <View style={styles.empty}>
                      <Ionicons name="barbell-outline" size={36} color={theme.muted} />
                      <Text style={styles.emptyTitle}>Cada marca empieza aquí</Text>
                      <Text style={styles.emptyText}>
                        Tus niveles de fuerza aparecerán al registrar entrenamientos con peso y
                        repeticiones.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="leaf-outline" size={36} color={theme.accent} />
                  <Text style={styles.emptyTitle}>Tus hábitos, a tu ritmo</Text>
                  <Text style={styles.emptyText}>
                    Encuentra tu registro de comidas y agua en Nutrición. Tus datos físicos están en
                    Ajustes.
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
    iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    username: { flex: 1, fontSize: 21, fontWeight: '800', color: theme.text, paddingHorizontal: 8 },
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 14 },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: theme.accentFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#182018', fontSize: 38, fontWeight: '800' },
    stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
    stat: { alignItems: 'center', flexShrink: 1 },
    statValue: { color: theme.text, fontSize: 21, fontWeight: '800' },
    statLabel: { color: theme.text, fontSize: 11, marginTop: 4 },
    personalSpace: { color: theme.muted, flex: 1, fontSize: 14 },
    bioSection: { marginTop: 18, gap: 7 },
    name: { color: theme.text, fontSize: 17, fontWeight: '800' },
    bio: { color: theme.text, fontSize: 14, lineHeight: 21 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    meta: { color: theme.muted, fontSize: 12 },
    dot: { color: theme.muted },
    xp: { color: theme.accent, fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
    action: {
      flex: 1,
      minHeight: 44,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      flexDirection: 'row',
      gap: 7,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    actionText: { color: theme.text, fontSize: 13, fontWeight: '700' },
    history: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    historyText: { color: theme.text, flex: 1, fontSize: 13, fontWeight: '600' },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginTop: 12,
    },
    tab: {
      flex: 1,
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: theme.accent },
    tabText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
    tabTextActive: { color: theme.text },
    strengthRow: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingVertical: 14,
    },
    strengthName: { color: theme.text, fontSize: 14, fontWeight: '700' },
    strengthMeta: { color: theme.muted, fontSize: 11, marginTop: 6 },
    empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 20, gap: 12 },
    emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
    errorBox: {
      padding: 14,
      backgroundColor: theme.warningSurface,
      borderRadius: 12,
      marginVertical: 12,
    },
    error: { color: theme.warningText, lineHeight: 21 },
    retry: { minHeight: 44, justifyContent: 'center' },
    link: { color: theme.accent, fontWeight: '700' },
  });
