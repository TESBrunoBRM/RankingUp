import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { PlanningMenuModal } from '../components/PlanningMenuModal';

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
import ProfileScreen from '../screens/ProfileScreen';
import AIWorkoutPlannerScreen from '../screens/AIWorkoutPlannerScreen';

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
      <Tab.Screen 
        name="CreateTab" 
        component={CreateWorkoutScreen} 
        options={{ 
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: () => {
             const setPlanningMenuOpen = useUIStore(s => s.setPlanningMenuOpen);
             return (
               <TouchableOpacity 
                 style={{
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
                   elevation: 5
                 }}
                 onPress={() => setPlanningMenuOpen(true)}
                 activeOpacity={0.8}
               >
                 <Ionicons name="add" size={32} color="#000" />
               </TouchableOpacity>
             );
          }
        }} 
      />
      <Tab.Screen name="NutritionTab" component={NutritionScreen} options={{ tabBarLabel: 'FOOD' }} />
      <Tab.Screen name="RankTab" component={RankingScreen} options={{ tabBarLabel: 'RANK' }} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <>
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      <AppStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <AppStack.Screen name="AddExercises" component={AddExercisesScreen} />
      <AppStack.Screen name="LogWorkout" component={LogWorkoutScreen} />
      <AppStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AppStack.Screen name="SearchFood" component={SearchFoodScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="AIPlanning" component={AIWorkoutPlannerScreen} />
    </AppStack.Navigator>
    <PlanningMenuModal />
    </>
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
