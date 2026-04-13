import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import AddExercisesScreen from '../screens/AddExercisesScreen';
import RankingScreen from '../screens/RankingScreen';
import LogWorkoutScreen from '../screens/LogWorkoutScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import NutritionScreen from '../screens/NutritionScreen';
import SearchFoodScreen from '../screens/SearchFoodScreen';

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
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#1A1A1A',
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#CCFF00',
        tabBarInactiveTintColor: '#666666',
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
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'HOME' }} />
      <Tab.Screen name="RoutineTab" component={WorkoutsScreen} options={{ tabBarLabel: 'ROUTINE' }} />
      <Tab.Screen name="CreateTab" component={CreateWorkoutScreen} options={{ tabBarLabel: 'LOG' }} />
      <Tab.Screen name="NutritionTab" component={NutritionScreen} options={{ tabBarLabel: 'FOOD' }} />
      <Tab.Screen name="RankTab" component={RankingScreen} options={{ tabBarLabel: 'RANK' }} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      <AppStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <AppStack.Screen name="AddExercises" component={AddExercisesScreen} />
      <AppStack.Screen name="LogWorkout" component={LogWorkoutScreen} />
      <AppStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AppStack.Screen name="SearchFood" component={SearchFoodScreen} />
    </AppStack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  return session && session.user ? <MainNavigator /> : <AuthNavigator />;
}
