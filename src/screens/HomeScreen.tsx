import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, Workout, Profile } from '../types';
import { workoutService } from '../services/workoutService';
import { workoutLogService } from '../services/workoutLogService';
import { authService } from '../services/auth';
import { Button } from '../components/Button';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

const WEEK_DAYS = [
  { id: 'MON', label: 'MON' },
  { id: 'TUE', label: 'TUE' },
  { id: 'WED', label: 'WED' },
  { id: 'THU', label: 'THU' },
  { id: 'FRI', label: 'FRI' },
  { id: 'SAT', label: 'SAT' },
  { id: 'SUN', label: 'SUN' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('MON');

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [wData, pData] = await Promise.all([
         workoutService.getWorkouts(user.id),
         workoutLogService.getUserProfile(user.id)
      ]);
      setWorkouts(wData);
      setProfile(pData);
      
      if (pData && (!pData.weight || !pData.height || !pData.goal || !pData.target_calories)) {
         navigation.replace('Onboarding' as any);
      }
    } catch (error) {
       console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [user])
  );



  const workoutsForSelectedDay = workouts.filter(w => w.scheduled_day === selectedDay);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>HOLA,</Text>
        <Text style={styles.name}>{user?.email?.split('@')[0].toUpperCase()}</Text>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile' as any)}>
          <Ionicons name="person-circle-outline" size={36} color="#CCFF00" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>WEEKLY ROUTINE</Text>
          <Text style={styles.subtitle}>PHASE: CUSTOM TRAINING</Text>
        </View>

        <View style={styles.gridContainer}>
           {WEEK_DAYS.map((day) => {
             const dayWorkouts = workouts.filter(w => w.scheduled_day === day.id);
             const hasWorkout = dayWorkouts.length > 0;
             const isSelected = selectedDay === day.id;
             const primaryWorkout = hasWorkout ? dayWorkouts[0] : null;
             
             return (
               <TouchableOpacity 
                 key={day.id} 
                 style={[
                   styles.dayCard, 
                   isSelected && styles.dayCardSelected,
                   !hasWorkout && !isSelected && styles.dayCardRest
                 ]}
                 onPress={() => setSelectedDay(day.id)}
                 activeOpacity={0.8}
               >
                 <Text style={[styles.dayCardTitle, isSelected && styles.dayCardTitleSelected]}>
                   {day.label}
                 </Text>
                 {hasWorkout ? (
                   <>
                     <Text style={[styles.iconText, isSelected && styles.iconTextSelected]}>⚡</Text>
                     <Text style={[styles.dayCardFocus, isSelected && styles.dayCardFocusSelected]} numberOfLines={1}>
                        {primaryWorkout?.name.toUpperCase()}
                     </Text>
                   </>
                 ) : (
                   <>
                     <Text style={[styles.iconText, isSelected && styles.iconTextSelected]}>🛌</Text>
                     <Text style={[styles.dayCardFocus, isSelected && styles.dayCardFocusSelected]}>REST</Text>
                   </>
                 )}
               </TouchableOpacity>
             );
           })}
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailsHeader}>
             <View>
               <Text style={styles.detailsTitle}>{selectedDay} DETAILS</Text>
               <Text style={styles.detailsSubtitle}>
                 {workoutsForSelectedDay.length > 0 ? `${workoutsForSelectedDay.length} Rutina(s) agendada(s)` : 'Día de descanso'}
               </Text>
             </View>
          </View>

          {loading ? (
             <ActivityIndicator size="small" color="#CCFF00" style={{ marginTop: 20 }} />
          ) : workoutsForSelectedDay.length > 0 ? (
             workoutsForSelectedDay.map(workout => (
                <TouchableOpacity 
                   key={workout.id} 
                   style={styles.workoutItem}
                   onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
                >
                   <View style={styles.workoutItemAvatar}>
                      <Text style={styles.workoutItemAvatarText}> {workout.name.charAt(0).toUpperCase()} </Text>
                   </View>
                   <View style={styles.workoutItemContent}>
                      <Text style={styles.workoutItemName}>{workout.name}</Text>
                      <Text style={styles.workoutItemDesc} numberOfLines={1}>{workout.description || 'Sin descripción'}</Text>
                   </View>
                   <Text style={styles.workoutItemArrow}>›</Text>
                </TouchableOpacity>
             ))
          ) : (
             <View style={styles.restCard}>
                <Text style={styles.restCardTitle}>DÍA DE DESCANSO</Text>
                <Text style={styles.restCardText}>Tus músculos crecen mientras descansas. Tómalo con calma.</Text>
                <TouchableOpacity style={styles.addWorkoutBtn} onPress={() => navigation.navigate('CreateTab' as any)}>
                   <Text style={styles.addWorkoutBtnText}>+ AGENDAR RUTINA</Text>
                </TouchableOpacity>
             </View>
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  greeting: { fontSize: 24, color: '#A0A0A0', fontWeight: '800', marginRight: 8 },
  name: { fontSize: 24, color: '#CCFF00', fontWeight: '900', flex: 1 },
  profileBtn: { padding: 4 },
  scrollContent: { paddingBottom: 40 },
  titleSection: { paddingHorizontal: 24, marginTop: 20, marginBottom: 20 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#A0A0A0', letterSpacing: 2, fontWeight: '700' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', gap: 12 },
  dayCard: { width: '46%', backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A', marginBottom: 8 },
  dayCardRest: { opacity: 0.6 },
  dayCardSelected: { backgroundColor: '#CCFF00', borderColor: '#CCFF00', transform: [{ scale: 1.02 }] },
  dayCardTitle: { fontSize: 12, color: '#A0A0A0', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  dayCardTitleSelected: { color: '#121212' },
  iconText: { fontSize: 20, marginBottom: 8 },
  iconTextSelected: { opacity: 0.9 },
  dayCardFocus: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  dayCardFocusSelected: { color: '#121212' },
  detailsSection: { marginTop: 30, paddingHorizontal: 24 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  detailsTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase' },
  detailsSubtitle: { fontSize: 12, color: '#A0A0A0', fontWeight: '600', marginTop: 4 },
  workoutItem: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  workoutItemAvatar: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  workoutItemAvatarText: { fontSize: 24, color: '#CCFF00', fontWeight: '900' },
  workoutItemContent: { flex: 1, marginLeft: 16 },
  workoutItemName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase' },
  workoutItemDesc: { fontSize: 12, color: '#A0A0A0', marginTop: 4, fontWeight: '500' },
  workoutItemArrow: { fontSize: 24, color: '#666', fontWeight: 'bold', marginLeft: 12 },
  restCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  restCardTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, marginBottom: 8 },
  restCardText: { fontSize: 13, color: '#A0A0A0', textAlign: 'center', marginBottom: 20 },
  addWorkoutBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#2A2A2A', borderRadius: 20 },
  addWorkoutBtnText: { color: '#CCFF00', fontWeight: '800', letterSpacing: 1, fontSize: 12 }
});
