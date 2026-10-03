import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text, Pressable } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { PlanningMenuModal } from '../components/PlanningMenuModal';
import { useThemePalette } from '../theme';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import LegalTermsScreen, { LEGAL_VERSION, LegalTermsContent } from '../screens/LegalTermsScreen';
import { authService } from '../services/auth';

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
import ProfileScreen from '../screens/ProfileScreen';
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

function CreateTabButton() {
  const setPlanningMenuOpen = useUIStore(s => s.setPlanningMenuOpen);

  return (
    <TouchableOpacity
      style={styles.createTabButton}
      onPress={() => setPlanningMenuOpen(true)}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={32} color="#000" />
    </TouchableOpacity>
  );
}

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
  const theme = useThemePalette();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 1,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'HomeTab') iconName = 'compass';
          else if (route.name === 'RoutineTab') iconName = 'barbell';
          else if (route.name === 'CreateTab') iconName = 'add-circle';
          else if (route.name === 'NutritionTab') iconName = 'restaurant';
          else if (route.name === 'RankTab') iconName = 'stats-chart';

          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'INICIO' }} />
      <Tab.Screen name="RoutineTab" component={WorkoutsScreen} options={{ tabBarLabel: 'RUTINAS' }} />
      <Tab.Screen
        name="CreateTab"
        component={CreateWorkoutScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: CreateTabButton
        }}
      />
      <Tab.Screen name="NutritionTab" component={NutritionScreen} options={{ tabBarLabel: 'NUTRICION' }} />
      <Tab.Screen name="RankTab" component={RankingScreen} options={{ tabBarLabel: 'RANGO' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createTabButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CCFF00',
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

function MainNavigator() {
  return (
    <>
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="MainTabs" component={MainTabs} />
        <AppStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
        <AppStack.Screen name="AddExercises" component={AddExercisesScreen} />
        <AppStack.Screen name="LogWorkout" component={ActiveSessionScreen} />
        <AppStack.Screen name="SessionSummary" component={SessionSummaryScreen} />
        <AppStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
        <AppStack.Screen name="WorkoutHistoryDetail" component={WorkoutHistoryDetailScreen} />
        <AppStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
        <AppStack.Screen name="ProgressFeed" component={ProgressFeedScreen} />
        <AppStack.Screen name="Onboarding" component={OnboardingScreen} />
        <AppStack.Screen name="SearchFood" component={SearchFoodScreen} />
        <AppStack.Screen name="FoodSubmission" component={FoodSubmissionScreen} />
        <AppStack.Screen name="Profile" component={ProfileScreen} />
        <AppStack.Screen name="LegalTerms" component={LegalTermsScreen} />
        <AppStack.Screen name="DiscoverProfiles" component={DiscoverProfilesScreen} />
        <AppStack.Screen name="PublicProfile" component={PublicProfileScreen} />
        <AppStack.Screen name="ProfileComparison" component={ProfileComparisonScreen} />
        <AppStack.Screen name="AIPlanning" component={AIWorkoutPlannerScreen} />
        <AppStack.Screen name="CameraScanner" component={CameraScannerScreen} />
        <AppStack.Screen name="Minigames" component={MinigamesScreen} />
        <AppStack.Screen name="PushUpsGame" component={PushUpsGameScreen} />
        <AppStack.Screen name="DuelLobby" component={DuelLobbyScreen} />
        <AppStack.Screen name="Duel" component={DuelScreen} />
      </AppStack.Navigator>
      <PlanningMenuModal />
    </>
  );
}

export default function AppNavigator() {
  const { session, isLoading } = useAuthStore();
  const theme = useThemePalette();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return session && session.user ? <LegalGate userId={session.user.id} /> : <AuthNavigator />;
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
  if (accepted === true) return <MainNavigator />;
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
