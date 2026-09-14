import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import type {
  AppStackParamList,
  FitnessNewsItem,
  HomeContentResponse,
  Profile,
  WeekDay,
  Workout,
  StreakResponse,
  StreakSummary,
  ProgressPost,
} from '../types';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { getCurrentWeekDay } from '../utils/date';
import { getErrorMessage } from '../utils/errors';
import { StreakBadge } from '../components/StreakBadge';
import { ProgressPostCard } from '../components/ProgressPostCard';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

const WEEK_DAYS = [
  { id: 'MON', label: 'L' },
  { id: 'TUE', label: 'M' },
  { id: 'WED', label: 'M' },
  { id: 'THU', label: 'J' },
  { id: 'FRI', label: 'V' },
  { id: 'SAT', label: 'S' },
  { id: 'SUN', label: 'D' },
] satisfies { id: WeekDay; label: string }[];

const HOME_DATE_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const NEWS_DATE_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
});

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DIAS';
  if (hour < 20) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
};

const formatNewsDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'RECIENTE' : NEWS_DATE_FORMATTER.format(date).toUpperCase();
};

interface NewsCardProps {
  item: FitnessNewsItem;
  onPress: (item: FitnessNewsItem) => void;
}

const NewsCard = React.memo(function NewsCard({ item, onPress }: NewsCardProps) {
  return (
    <Pressable style={styles.newsCard} onPress={() => onPress(item)}>
      <View style={styles.newsIcon}>
        <Ionicons name="newspaper-outline" size={22} color="#CCFF00" />
      </View>
      <View style={styles.newsMetaRow}>
        <Text style={styles.newsSource} numberOfLines={1}>{item.source.toUpperCase()}</Text>
        <Text style={styles.newsDate}>{formatNewsDate(item.publishedAt)}</Text>
      </View>
      <Text style={styles.newsTitle} numberOfLines={3}>{item.title}</Text>
      <View style={styles.newsLinkRow}>
        <Text style={styles.newsLink}>LEER NOTICIA</Text>
        <Ionicons name="arrow-forward" size={15} color="#CCFF00" />
      </View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const splashAnimation = useRef(new Animated.Value(0)).current;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeContent, setHomeContent] = useState<HomeContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() => getCurrentWeekDay());
  const [splashIndex, setSplashIndex] = useState(0);
  const [streak, setStreak] = useState<StreakSummary>({ current: 0, longest: 0, lastActivityDate: null });
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [streakDetails, setStreakDetails] = useState<StreakResponse | null>(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [progressPosts, setProgressPosts] = useState<ProgressPost[]>([]);

  const checkInStreak = useCallback(async () => {
    if (!user) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const now = new Date();
    const key = `streak:lastCheckIn:${user.id}`;
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const marker = `${timeZone}:${localDate}`;
    try {
      if (await AsyncStorage.getItem(key) === marker) return;
      const result = await rankingUpApiClient.checkInStreak(timeZone);
      setStreak((previous) => ({
        current: result.currentStreak,
        longest: result.longestStreak,
        lastActivityDate: result.isNewDay ? localDate : previous.lastActivityDate,
      }));
      await AsyncStorage.setItem(key, marker);
      if (result.isNewDay) Vibration.vibrate(75);
    } catch (error: unknown) {
      console.warn('Streak:', getErrorMessage(error, 'No se pudo actualizar la racha.'));
    }
  }, [user]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkInStreak();
    });
    return () => subscription.remove();
  }, [checkInStreak]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      setDashboardError('');
      const dashboard = await rankingUpApiClient.getDashboard();
      setWorkouts(dashboard.workouts);
      setProfile(dashboard.profile);
      if (dashboard.streak) setStreak(dashboard.streak);
      if (dashboard.requiresOnboarding) navigation.replace('Onboarding');
      else void checkInStreak();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo cargar tu resumen.');
      setDashboardError(message);
      console.warn('HomeScreen:', message);
    } finally {
      setLoading(false);
    }
  }, [checkInStreak, navigation, user]);

  const openStreak = useCallback(async () => {
    setStreakModalOpen(true);
    setStreakLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      setStreakDetails(await rankingUpApiClient.getStreak(timeZone));
    } catch (error: unknown) {
      console.warn('Streak calendar:', getErrorMessage(error, 'No se pudo cargar el calendario.'));
    } finally {
      setStreakLoading(false);
    }
  }, []);

  const fetchHomeContent = useCallback(async () => {
    try {
      setHomeContent(await rankingUpApiClient.getHomeContent());
    } catch (error: unknown) {
      console.warn('HomeContent:', getErrorMessage(error, 'No se pudo cargar el contenido editorial.'));
    } finally {
      setContentLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void fetchDashboardData();
    void fetchHomeContent();
    const feedTimer = setTimeout(() => {
      void rankingUpApiClient.getProgressFeed().then((result) => setProgressPosts(result.items.slice(0, 2))).catch(() => undefined);
    }, 1200);
    return () => clearTimeout(feedTimer);
  }, [fetchDashboardData, fetchHomeContent]));

  const messages = homeContent?.messages ?? [];
  useEffect(() => {
    if (messages.length === 0) return undefined;
    splashAnimation.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(splashAnimation, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(3_300),
      Animated.timing(splashAnimation, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setSplashIndex((current) => (current + 1) % messages.length);
    });
    return () => animation.stop();
  }, [messages.length, splashAnimation, splashIndex]);

  const workoutsForSelectedDay = useMemo(
    () => workouts.filter((workout) => workout.scheduled_day === selectedDay),
    [selectedDay, workouts],
  );
  const workoutsToday = useMemo(
    () => workouts.filter((workout) => workout.scheduled_day === getCurrentWeekDay()),
    [workouts],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchDashboardData(), fetchHomeContent(), rankingUpApiClient.getProgressFeed().then((result) => setProgressPosts(result.items.slice(0, 2)))]);
    setRefreshing(false);
  }, [fetchDashboardData, fetchHomeContent]);

  const openNews = useCallback(async (item: FitnessNewsItem) => {
    try {
      if (!(await Linking.canOpenURL(item.url))) throw new Error('unsupported');
      await Linking.openURL(item.url);
    } catch {
      Alert.alert('Enlace no disponible', 'No se pudo abrir esta noticia en el dispositivo.');
    }
  }, []);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'ATLETA';
  const currentMessage = messages[splashIndex % Math.max(messages.length, 1)];
  const splashStyle = {
    opacity: splashAnimation,
    transform: [
      { rotate: '-5deg' },
      { scale: splashAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{getGreeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>{displayName.toUpperCase()}</Text>
          <Text style={styles.date}>{HOME_DATE_FORMATTER.format(new Date()).toUpperCase()}</Text>
        </View>
        <StreakBadge count={streak.current} onPress={() => void openStreak()} />
        <Pressable accessibilityLabel="Abrir perfil" style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={21} color="#CCFF00" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor="#CCFF00" colors={['#CCFF00']} />}
      >
        <View style={styles.summaryBand}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{profile?.xp ?? 0}</Text>
            <Text style={styles.summaryLabel}>XP TOTAL</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{workouts.length}</Text>
            <Text style={styles.summaryLabel}>RUTINAS</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{workoutsToday.length || 'LIBRE'}</Text>
            <Text style={styles.summaryLabel}>PARA HOY</Text>
          </View>
        </View>

        <View style={styles.splashViewport}>
          {currentMessage ? (
            <Animated.Text style={[styles.splashText, splashStyle]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.78}>
              {currentMessage.text}
            </Animated.Text>
          ) : contentLoading ? (
            <ActivityIndicator size="small" color="#CCFF00" />
          ) : (
            <Text style={styles.splashText}>SIGUE SUMANDO REPETICIONES.</Text>
          )}
        </View>

        {dashboardError ? (
          <View style={styles.notice}>
            <Ionicons name="cloud-offline-outline" size={20} color="#FF9F0A" />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>NO SE PUDO ACTUALIZAR</Text>
              <Text style={styles.noticeText}>{dashboardError}</Text>
            </View>
            <Pressable accessibilityLabel="Reintentar" style={styles.retryButton} onPress={() => void fetchDashboardData()}>
              <Ionicons name="refresh" size={18} color="#CCFF00" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>PLANIFICACION</Text>
            <Text style={styles.sectionTitle}>TU SEMANA</Text>
          </View>
          <Text style={styles.sectionMeta}>{workouts.length} PROGRAMADAS</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {WEEK_DAYS.map((day) => {
            const isSelected = selectedDay === day.id;
            const hasWorkout = workouts.some((workout) => workout.scheduled_day === day.id);
            const isToday = getCurrentWeekDay() === day.id;
            return (
              <Pressable
                key={day.id}
                accessibilityLabel={`Seleccionar ${day.id}`}
                style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                onPress={() => setSelectedDay(day.id)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day.label}</Text>
                <View style={[styles.dayDot, hasWorkout && styles.dayDotWorkout, isSelected && styles.dayDotSelected]} />
                {isToday ? <Text style={[styles.todayLabel, isSelected && styles.todayLabelSelected]}>HOY</Text> : <View style={styles.todaySpacer} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.workoutHeader}>
          <Text style={styles.workoutDay}>DIA {WEEK_DAYS.find((day) => day.id === selectedDay)?.label}</Text>
          <Text style={styles.workoutCount}>{workoutsForSelectedDay.length ? `${workoutsForSelectedDay.length} SESION` : 'RECUPERACION'}</Text>
        </View>

        {loading && workouts.length === 0 ? (
          <View style={styles.loadingBlock}><ActivityIndicator color="#CCFF00" /></View>
        ) : workoutsForSelectedDay.length > 0 ? (
          workoutsForSelectedDay.map((workout) => (
            <Pressable
              key={workout.id}
              style={styles.workoutItem}
              onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
            >
              <View style={styles.workoutIcon}>
                <Ionicons name="barbell" size={23} color="#CCFF00" />
              </View>
              <View style={styles.workoutContent}>
                <Text style={styles.workoutName} numberOfLines={1}>{workout.name.toUpperCase()}</Text>
                <Text style={styles.workoutDescription} numberOfLines={2}>{workout.description || 'Rutina lista para comenzar.'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6D7681" />
            </Pressable>
          ))
        ) : (
          <View style={styles.restState}>
            <View style={styles.restIcon}><Ionicons name="moon-outline" size={26} color="#8D96A1" /></View>
            <View style={styles.restCopy}>
              <Text style={styles.restTitle}>DIA DE DESCANSO</Text>
              <Text style={styles.restText}>Recupera energia o agenda una sesion para este dia.</Text>
            </View>
            <Pressable accessibilityLabel="Crear rutina" style={styles.addButton} onPress={() => navigation.navigate('MainTabs', { screen: 'CreateTab' })}>
              <Ionicons name="add" size={22} color="#111111" />
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeaderNews}>
          <View>
            <Text style={styles.sectionEyebrow}>ACTUALIDAD</Text>
            <Text style={styles.sectionTitle}>NOTICIAS FITNESS</Text>
          </View>
          {homeContent ? (
            <View style={styles.feedStatus}>
              <View style={[styles.statusDot, homeContent.newsStatus === 'live' && styles.statusDotLive]} />
              <Text style={styles.feedStatusText}>{homeContent.newsStatus === 'live' ? 'EN VIVO' : 'SELECCION'}</Text>
            </View>
          ) : null}
        </View>

        {contentLoading && !homeContent ? (
          <View style={styles.newsLoading}>
            <ActivityIndicator size="small" color="#CCFF00" />
            <Text style={styles.newsLoadingText}>Buscando novedades...</Text>
          </View>
        ) : homeContent?.news.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsRow}>
            {homeContent.news.map((item) => <NewsCard key={item.id} item={item} onPress={openNews} />)}
          </ScrollView>
        ) : (
          <View style={styles.newsLoading}><Text style={styles.newsLoadingText}>Las noticias no estan disponibles por ahora.</Text></View>
        )}
        <View style={styles.sectionHeaderNews}>
          <View><Text style={styles.sectionEyebrow}>COMUNIDAD</Text><Text style={styles.sectionTitle}>PROGRESO</Text></View>
          <Pressable onPress={() => navigation.navigate('ProgressFeed')}><Text style={styles.progressLink}>VER TODO  ›</Text></Pressable>
        </View>
        {progressPosts.length ? <View style={styles.progressList}>{progressPosts.map((post) => <ProgressPostCard key={post.id} post={post} onDeleted={(id) => setProgressPosts((current) => current.filter((item) => item.id !== id))} />)}</View>
          : <Pressable style={styles.progressEmpty} onPress={() => navigation.navigate('ProgressFeed')}><Ionicons name="people-outline" color="#CCFF00" size={23} /><Text style={styles.progressEmptyText}>Aún no hay progreso de tu comunidad.</Text></Pressable>}
      </ScrollView>
      <Modal visible={streakModalOpen} transparent animationType="fade" onRequestClose={() => setStreakModalOpen(false)}>
        <View style={styles.streakBackdrop}>
          <View style={styles.streakPanel}>
            <View style={styles.streakPanelHeader}>
              <View>
                <Text style={styles.streakPanelTitle}>TU RACHA</Text>
                <Text style={styles.streakPanelSubtitle}>{streak.current} dias actuales · mejor: {streak.longest}</Text>
              </View>
              <Pressable onPress={() => setStreakModalOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar calendario">
                <Ionicons name="close" size={23} color="#AEB5BF" />
              </Pressable>
            </View>
            {streakLoading ? <ActivityIndicator color="#CCFF00" style={styles.streakSpinner} /> : (
              <View style={styles.streakCalendar}>
                {streakDetails?.days.map((day) => (
                  <View key={day.date} style={[styles.streakDay, day.active && styles.streakDayActive]}>
                    {day.active ? <Ionicons name="checkmark" size={15} color="#101114" /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { minHeight: 94, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#24262B' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#7E8792', fontSize: 10, fontWeight: '900' },
  name: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 2 },
  date: { color: '#CCFF00', fontSize: 10, fontWeight: '800', marginTop: 4 },
  profileButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B1D22', borderWidth: 1, borderColor: '#30333A', marginLeft: 14 },
  streakBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 },
  streakPanel: { width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: '#191B20', borderRadius: 8, borderWidth: 1, borderColor: '#30333A', padding: 20 },
  streakPanelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  streakPanelTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  streakPanelSubtitle: { color: '#AAB1BA', fontSize: 12, marginTop: 5 },
  streakSpinner: { marginVertical: 45 },
  streakCalendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  streakDay: { width: '12%', aspectRatio: 1, borderRadius: 6, backgroundColor: '#2B2E35', alignItems: 'center', justifyContent: 'center' },
  streakDayActive: { backgroundColor: '#CCFF00' },
  content: { paddingTop: 18, paddingBottom: 120 },
  summaryBand: { minHeight: 72, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2E35' },
  summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  summaryLabel: { color: '#727B86', fontSize: 8, fontWeight: '900', marginTop: 4 },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#2B2E35' },
  splashViewport: { height: 100, marginHorizontal: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  splashText: { width: '94%', color: '#FFF600', fontSize: 20, lineHeight: 23, fontWeight: '900', textAlign: 'center', textShadowColor: '#000000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  notice: { marginHorizontal: 20, marginBottom: 20, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, padding: 12, backgroundColor: 'rgba(255,159,10,0.08)', borderWidth: 1, borderColor: 'rgba(255,159,10,0.25)' },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  noticeText: { color: '#A8B0BA', fontSize: 11, lineHeight: 16, marginTop: 3 },
  retryButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { marginTop: 8, marginBottom: 12, paddingHorizontal: 20, minHeight: 42, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionHeaderNews: { marginTop: 34, marginBottom: 14, paddingHorizontal: 20, minHeight: 42, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: '#7E8792', fontSize: 9, fontWeight: '900', marginBottom: 3 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  sectionMeta: { color: '#727B86', fontSize: 9, fontWeight: '800' },
  weekRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 18 },
  dayButton: { width: 44, height: 70, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191B20', borderWidth: 1, borderColor: '#2B2E35' },
  dayButtonSelected: { backgroundColor: '#CCFF00', borderColor: '#CCFF00' },
  dayText: { color: '#D7DCE2', fontSize: 13, fontWeight: '900' },
  dayTextSelected: { color: '#111111' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3A3E46', marginTop: 7 },
  dayDotWorkout: { backgroundColor: '#CCFF00' },
  dayDotSelected: { backgroundColor: '#111111' },
  todayLabel: { color: '#727B86', fontSize: 7, fontWeight: '900', marginTop: 5 },
  todayLabelSelected: { color: '#111111' },
  todaySpacer: { height: 13 },
  workoutHeader: { minHeight: 32, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workoutDay: { color: '#C5CBD2', fontSize: 10, fontWeight: '900' },
  workoutCount: { color: '#727B86', fontSize: 9, fontWeight: '800' },
  loadingBlock: { height: 92, alignItems: 'center', justifyContent: 'center' },
  workoutItem: { minHeight: 82, marginHorizontal: 20, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#2B2E35' },
  workoutIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#24272D' },
  workoutContent: { flex: 1, minWidth: 0 },
  workoutName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  workoutDescription: { color: '#858E99', fontSize: 11, lineHeight: 16, marginTop: 4 },
  restState: { minHeight: 82, marginHorizontal: 20, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 8, borderWidth: 1, borderColor: '#2B2E35', borderStyle: 'dashed' },
  restIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  restCopy: { flex: 1 },
  restTitle: { color: '#D7DCE2', fontSize: 12, fontWeight: '900' },
  restText: { color: '#727B86', fontSize: 10, lineHeight: 15, marginTop: 4 },
  addButton: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CCFF00' },
  feedStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF9F0A' },
  statusDotLive: { backgroundColor: '#5CE18B' },
  feedStatusText: { color: '#7E8792', fontSize: 8, fontWeight: '900' },
  newsRow: { paddingHorizontal: 20, gap: 10 },
  newsCard: { width: 264, height: 180, padding: 15, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#2B2E35' },
  newsIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#24272D', marginBottom: 12 },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  newsSource: { flex: 1, color: '#CCFF00', fontSize: 9, fontWeight: '900' },
  newsDate: { color: '#727B86', fontSize: 8, fontWeight: '800' },
  newsTitle: { flex: 1, color: '#FFFFFF', fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 7 },
  newsLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  newsLink: { color: '#CCFF00', fontSize: 9, fontWeight: '900' },
  newsLoading: { minHeight: 120, marginHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2B2E35', borderStyle: 'dashed' },
  newsLoadingText: { color: '#7E8792', fontSize: 11 },
  progressLink: { color: '#CCFF00', fontSize: 10, fontWeight: '900' },
  progressList: { paddingHorizontal: 20 },
  progressEmpty: { marginHorizontal: 20, minHeight: 90, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2E35', flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressEmptyText: { color: '#8D96A1', fontSize: 12 },
});
