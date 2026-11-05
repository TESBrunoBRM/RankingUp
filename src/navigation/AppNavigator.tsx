import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, AppState, Platform, Text, Pressable } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { syncWeightReminder } from '../services/weightReminder';
import ReportsScreen from '../screens/ReportsScreen';
import { MainTabBar } from '../components/MainTabBar';
import { PlanningMenuModal } from '../components/PlanningMenuModal';
import { useThemePalette } from '../theme';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import LegalTermsScreen, { LEGAL_VERSION, LegalTermsContent } from '../screens/LegalTermsScreen';
import { authService } from '../services/auth';
import ExperienceSetupScreen, { ExperienceSetup } from '../screens/ExperienceSetupScreen';
import { hasCurrentExperience } from '../constants/experience';
import { useEnabledFeatures, useExperienceStore } from '../store/experienceStore';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import AddExercisesScreen from '../screens/AddExercisesScreen';
import RankingScreen from '../screens/RankingScreen';
import ActiveSessionScreen from '../screens/ActiveSessionScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import WorkoutHistoryDetailScreen from '../screens/WorkoutHistoryDetailScreen';
import ExerciseProgressScreen from '../screens/ExerciseProgressScreen';
import ProgressFeedScreen from '../screens/ProgressFeedScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import NutritionScreen from '../screens/NutritionScreen';
import SearchFoodScreen from '../screens/SearchFoodScreen';
import FoodSubmissionScreen from '../screens/FoodSubmissionScreen';
import ReportPostScreen from '../screens/ReportPostScreen';
import ReportBugScreen from '../screens/ReportBugScreen';
import MySubmissionsScreen from '../screens/MySubmissionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BillingScreen from '../screens/BillingScreen';
import ProfileMetricsScreen from '../screens/ProfileMetricsScreen';
import DiscoverProfilesScreen from '../screens/DiscoverProfilesScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import ProfileComparisonScreen from '../screens/ProfileComparisonScreen';
import AIWorkoutPlannerScreen from '../screens/AIWorkoutPlannerScreen';
import CameraScannerScreen from '../screens/CameraScannerScreen';
import MinigamesScreen from '../screens/MinigamesScreen';
import PushUpsGameScreen from '../screens/PushUpsGameScreen';
import DuelLobbyScreen from '../screens/DuelLobbyScreen';
import DuelScreen from '../screens/DuelScreen';

// Types
import type { AuthStackParamList, AppStackParamList, MainTabParamList } from '../types';


const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Terms" component={LegalTermsScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { training, nutrition } = useEnabledFeatures();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  useEffect(() => {
    if (Platform.OS === 'web' || (!training && !nutrition)) return;
    const openReport = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      if (data?.screen === 'Reports' && data.userId === useAuthStore.getState().session?.user.id) {
        navigation.navigate('Reports');
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }
    };
    let active = true;
    void Notifications.getLastNotificationResponseAsync().then(response => { if (active) openReport(response); }).catch(() => undefined);
    const listener = Notifications.addNotificationResponseReceivedListener(openReport);
    return () => { active = false; listener.remove(); };
  }, [navigation, training, nutrition]);
  return (
    <Tab.Navigator tabBar={props => <MainTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'INICIO' }} />
      {training ? <Tab.Screen name="RoutineTab" component={WorkoutsScreen} options={{ tabBarLabel: 'RUTINAS' }} /> : null}
      {nutrition ? <Tab.Screen name="NutritionTab" component={NutritionScreen} options={{ tabBarLabel: 'NUTRICIÓN' }} /> : null}
      {training || nutrition ? <Tab.Screen name="ReportsTab" component={ReportsScreen} options={{ tabBarLabel: 'INFORMES' }} /> : null}
    </Tab.Navigator>
  );
}

function MainNavigator() {
  const { training, nutrition, community } = useEnabledFeatures();
  const theme = useThemePalette();
  const backHeader = { headerShown: true, headerBackTitle: 'Volver', headerTintColor: theme.text, headerStyle: { backgroundColor: theme.background }, headerShadowVisible: false };
  return (
    <>
      <AppStack.Navigator key={`${training}:${nutrition}:${community}`} screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="MainTabs" component={MainTabs} />
        <AppStack.Screen name="ExperienceSetup" component={ExperienceSetupScreen} />
        {training ? <AppStack.Group>
        <AppStack.Screen name="CreateWorkout" component={CreateWorkoutScreen} options={{ ...backHeader, title: 'Crear rutina' }} />
        <AppStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
        <AppStack.Screen name="AddExercises" component={AddExercisesScreen} />
        <AppStack.Screen name="LogWorkout" component={ActiveSessionScreen} />
        <AppStack.Screen name="SessionSummary" component={SessionSummaryScreen} />
        <AppStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
        <AppStack.Screen name="WorkoutHistoryDetail" component={WorkoutHistoryDetailScreen} />
        <AppStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
        <AppStack.Screen name="AIPlanning" component={AIWorkoutPlannerScreen} />
        </AppStack.Group> : null}
        {nutrition ? <AppStack.Group>
        <AppStack.Screen name="Onboarding" component={OnboardingScreen} />
        <AppStack.Screen name="SearchFood" component={SearchFoodScreen} />
        <AppStack.Screen name="FoodSubmission" component={FoodSubmissionScreen} />
        <AppStack.Screen name="CameraScanner" component={CameraScannerScreen} />
        </AppStack.Group> : null}
        <AppStack.Screen name="ReportBug" component={ReportBugScreen} />
        <AppStack.Screen name="MySubmissions" component={MySubmissionsScreen} />
        <AppStack.Screen name="Profile" component={ProfileScreen} />
        <AppStack.Screen name="EditProfile" component={EditProfileScreen} />
        <AppStack.Screen name="Settings" component={SettingsScreen} />
        <AppStack.Screen name="Billing" component={BillingScreen} />
        {training || nutrition ? <AppStack.Screen name="Reports" component={ReportsScreen} /> : null}
        {training || nutrition ? <AppStack.Screen name="ProfileMetrics" component={ProfileMetricsScreen} /> : null}
        <AppStack.Screen name="LegalTerms" component={LegalTermsScreen} />
        {community ? <AppStack.Group>
        <AppStack.Screen name="ProgressFeed" component={ProgressFeedScreen} />
        <AppStack.Screen name="ReportPost" component={ReportPostScreen} />
        <AppStack.Screen name="DiscoverProfiles" component={DiscoverProfilesScreen} />
        <AppStack.Screen name="PublicProfile" component={PublicProfileScreen} />
        <AppStack.Screen name="ProfileComparison" component={ProfileComparisonScreen} />
        </AppStack.Group> : null}
        {training && community ? <AppStack.Group>
        <AppStack.Screen name="Ranking" component={RankingScreen} options={{ ...backHeader, title: 'Rango' }} />
        <AppStack.Screen name="Minigames" component={MinigamesScreen} />
        <AppStack.Screen name="PushUpsGame" component={PushUpsGameScreen} />
        <AppStack.Screen name="DuelLobby" component={DuelLobbyScreen} />
        <AppStack.Screen name="Duel" component={DuelScreen} />
        </AppStack.Group> : null}
      </AppStack.Navigator>
      {training ? <PlanningMenuModal /> : null}
    </>
  );
}

export default function AppNavigator() {
  const { session, isLoading } = useAuthStore();
  const theme = useThemePalette();
  const userId = session?.user.id ?? null;
  const reportsEnabled = useExperienceStore(state => state.userId === userId
    && Boolean(state.preferences?.features.some(feature => feature === 'training' || feature === 'nutrition')));
  useEffect(() => {
    const sync = () => { void syncWeightReminder(reportsEnabled ? userId : null).catch(() => console.warn('No se pudo sincronizar el recordatorio semanal.')); };
    sync();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => listener.remove();
  }, [userId, reportsEnabled]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return session && session.user ? <LegalGate key={session.user.id} userId={session.user.id} /> : <AuthNavigator />;
}

function LegalGate({ userId }: { userId: string }) {
  const theme = useThemePalette();
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const check = async () => {
    setError('');
    try {
      const result = await rankingUpApiClient.getLegalAcceptance();
      if (result.version !== LEGAL_VERSION) throw new Error('Esta versión de RankingUp necesita actualizarse para mostrar los términos vigentes.');
      setAccepted(result.accepted);
    }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo comprobar la aceptación.'); }
  };
  useEffect(() => { setAccepted(null); void check(); }, [userId]);
  if (accepted === true) return <ExperienceGate userId={userId} />;
  if (accepted === false) return <LegalTermsContent closeLabel="Cerrar sesión" onClose={() => void authService.logout()} onAccept={async () => {
    const result = await rankingUpApiClient.acceptLegalTerms();
    if (result.version !== LEGAL_VERSION) throw new Error('Los términos cambiaron. Actualiza la aplicación.');
    setAccepted(true);
  }} />;
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.background }}>
    {error ? <><Text style={{ color: theme.text, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
      <Pressable onPress={() => void check()}><Text style={{ color: theme.accent, fontWeight: '800' }}>REINTENTAR</Text></Pressable></>
      : <ActivityIndicator color={theme.accent} size="large" />}
  </View>;
}

function ExperienceGate({ userId }: { userId: string }) {
  const theme = useThemePalette();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const preferences = useExperienceStore(state => state.userId === userId ? state.preferences : null);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setError('');
    useExperienceStore.getState().setPreferences(userId, null);
    void rankingUpApiClient.getExperience().then(result => {
      if (!active) return;
      useExperienceStore.getState().setPreferences(userId, result);
      setLoaded(true);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar tu configuración.');
    });
    return () => { active = false; };
  }, [userId, attempt]);

  if (loaded && hasCurrentExperience(preferences)) return <MainNavigator />;
  if (loaded) return <ExperienceSetup initial={preferences} onComplete={result => {
    if (useAuthStore.getState().session?.user.id === userId) useExperienceStore.getState().setPreferences(userId, result);
  }} />;
  return <View style={{ flex: 1, backgroundColor: theme.background, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
    {error ? <><Text accessibilityRole="alert" style={{ color: theme.text, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
      <Pressable accessibilityRole="button" style={{ padding: 16 }} onPress={() => setAttempt(value => value + 1)}><Text style={{ color: theme.accent }}>Reintentar</Text></Pressable>
      <Pressable accessibilityRole="button" style={{ padding: 16 }} onPress={() => void authService.logout()}><Text style={{ color: theme.text }}>Cerrar sesión</Text></Pressable></>
      : <ActivityIndicator color={theme.accent} size="large" />}
  </View>;
}
