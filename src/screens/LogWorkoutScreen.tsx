import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, WorkoutExercise, Exercise } from '../types';
import { workoutExerciseService } from '../services/workoutExerciseService';
import { exerciseApi } from '../services/exerciseApi';
import { workoutLogService } from '../services/workoutLogService';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';

type LogWorkoutRouteProp = RouteProp<AppStackParamList, 'LogWorkout'>;
type LogWorkoutNavigationProp = NativeStackNavigationProp<AppStackParamList, 'LogWorkout'>;

interface SetLog {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

interface LogItem extends WorkoutExercise {
  exerciseDetails?: Exercise;
  setsData: SetLog[];
}

export default function LogWorkoutScreen() {
  const route = useRoute<LogWorkoutRouteProp>();
  const navigation = useNavigation<LogWorkoutNavigationProp>();
  const { workoutId } = route.params;
  const { user } = useAuthStore();

  const [exercises, setExercises] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Animation States
  const [showXpAnim, setShowXpAnim] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const workoutExercises = await workoutExerciseService.getWorkoutExercises(workoutId);
        
        const enriched = await Promise.all(
          workoutExercises.map(async (we) => {
            let details;
            try {
              details = await exerciseApi.getExerciseByName(we.exercise_id);
            } catch (error) {}
            
            const setsData: SetLog[] = Array.from({ length: we.sets || 1 }).map((_, idx) => ({
              id: `${we.id}-set-${idx}`,
              weight: '',
              reps: we.reps.toString(),
              completed: false
            }));

            return { ...we, exerciseDetails: details, setsData };
          })
        );
        setExercises(enriched);
      } catch (error: any) {
        Alert.alert('Error', 'No se pudieron cargar los ejercicios.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workoutId]);

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          setsData: ex.setsData.map(s => s.id === setId ? { ...s, completed: !s.completed } : s)
        };
      }
      return ex;
    }));
  };

  const updateSetData = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          setsData: ex.setsData.map(s => s.id === setId ? { ...s, [field]: value } : s)
        };
      }
      return ex;
    }));
  };

  const triggerAnimation = (xpAmount: number) => {
    setEarnedXp(xpAmount);
    setShowXpAnim(true);

    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(floatValue, {
        toValue: -20,
        duration: 1500,
        useNativeDriver: true,
      })
    ]).start();

    setTimeout(() => {
      // Auto nav to ranking to see the new XP fill the bar
      (navigation as any).navigate('MainTabs', { screen: 'RankTab' });
    }, 2800);
  };

  const handleSaveData = async () => {
    const logsPayload: any[] = [];
    
    exercises.forEach(ex => {
       ex.setsData.forEach(set => {
          if (set.completed) {
             logsPayload.push({
               exercise_id: ex.exercise_id,
               weight: parseFloat(set.weight) || 0,
               reps: parseInt(set.reps) || 0,
               muscle: ex.exerciseDetails?.muscle || 'default'
             });
          }
       });
    });

    if (logsPayload.length === 0) {
      Alert.alert('Atención', 'Marca por lo menos una serie (sección verde) como completada para guardar el log.');
      return;
    }
    
    if (!user) return;

    try {
      setSaving(true);
      const result = await workoutLogService.logWorkoutSession(user.id, workoutId, logsPayload);
      
      // Stop saving to remove button spinner, trigger massive visual animation
      setSaving(false);
      triggerAnimation(result.gainedXp);
      
    } catch (error: any) {
      setSaving(false);
      Alert.alert('Error', error.message);
    }
  };

  const renderSetRow = (ex: LogItem, set: SetLog, index: number) => {
    return (
      <View key={set.id} style={[styles.setRow, set.completed && styles.setRowCompleted]}>
        <View style={styles.setNumberBox}>
          <Text style={styles.setNumberText}>{index + 1}</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.setNumberInput}
            keyboardType="numeric"
            placeholder="Kg/Lb"
            placeholderTextColor="#666"
            value={set.weight}
            onChangeText={(t) => updateSetData(ex.id, set.id, 'weight', t)}
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.setNumberInput}
            keyboardType="numeric"
            value={set.reps}
            onChangeText={(t) => updateSetData(ex.id, set.id, 'reps', t)}
          />
        </View>

        <TouchableOpacity 
          style={[styles.checkButton, set.completed && styles.checkButtonActive]}
          onPress={() => toggleSetComplete(ex.id, set.id)}
        >
          <Text style={[styles.checkText, set.completed && styles.checkTextActive]}>✓</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: LogItem }) => {
    const isExerciseCompleted = item.setsData.every(s => s.completed);

    return (
      <View style={[styles.card, isExerciseCompleted && styles.cardCompleted]}>
        <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
           <Text style={[styles.exerciseName, { flex: 1, marginRight: 10 }]} numberOfLines={2}>{item.exercise_id}</Text>
           <TouchableOpacity onPress={() => Alert.alert('Técnica y Ejecución', item.exerciseDetails?.instructions || 'No hay descripción disponible para este ejercicio.')} style={{ padding: 4 }}>
             <Text style={{color: '#CCFF00', fontSize: 12, fontWeight: '900', letterSpacing: 1}}>TÉCNICA ℹ️</Text>
           </TouchableOpacity>
        </View>
        
        <View style={styles.setHeaderRow}>
          <Text style={styles.setHeaderText}>SET</Text>
          <Text style={styles.setHeaderText}>PESO</Text>
          <Text style={styles.setHeaderText}>REPS</Text>
          <Text style={styles.setHeaderText}>OK</Text>
        </View>

        {item.setsData.map((set, index) => renderSetRow(item, set, index))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={saving || showXpAnim}>
          <Text style={styles.backButtonText}>‹ CANCELAR</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.mainTitle}>REGISTRAR LOG</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        ) : (
          <>
            <FlatList
              data={exercises}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>RUTINA VACÍA</Text>
                </View>
              }
            />
            <View style={styles.footer}>
              <Button
                title="FINALIZAR ENTRENAMIENTO"
                onPress={handleSaveData}
                loading={saving}
                disabled={exercises.length === 0 || showXpAnim}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Massive XP Animation Overlay */}
      {showXpAnim && (
        <View style={styles.xpOverlay}>
          <Animated.View style={[
            styles.xpBadge,
            {
              opacity: opacityValue,
              transform: [
                { scale: scaleValue },
                { translateY: floatValue }
              ]
            }
          ]}>
            <Text style={styles.xpEarnedText}>+{earnedXp} XP</Text>
            <Text style={styles.xpSubText}>ENTRENAMIENTO COMPLETADO</Text>
          </Animated.View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { paddingVertical: 8 },
  backButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#CCFF00', paddingHorizontal: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#333333' },
  cardCompleted: { borderColor: '#CCFF00', backgroundColor: '#1c220f' },
  cardHeader: { marginBottom: 12 },
  exerciseName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase' },
  
  setHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10 },
  setHeaderText: { color: '#A0A0A0', fontSize: 11, fontWeight: '900', letterSpacing: 1, width: '20%', textAlign: 'center' },
  
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
  setRowCompleted: { backgroundColor: 'rgba(204, 255, 0, 0.1)' },
  
  setNumberBox: { width: '20%', alignItems: 'center' },
  setNumberText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  
  inputGroup: { width: '25%', alignItems: 'center' },
  setNumberInput: { backgroundColor: '#121212', borderWidth: 1, borderColor: '#333', borderRadius: 8, width: '100%', height: 40, color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  
  checkButton: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  checkButtonActive: { backgroundColor: '#CCFF00' },
  checkText: { color: '#666', fontSize: 18, fontWeight: 'bold' },
  checkTextActive: { color: '#1A1A1A' },
  
  footer: { padding: 24, paddingBottom: 32, backgroundColor: '#121212', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#FFFFFF', fontWeight: '900', letterSpacing: 2 },

  // Xp Animation Styles
  xpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  xpBadge: {
    alignItems: 'center',
  },
  xpEarnedText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#CCFF00',
    textShadowColor: '#CCFF00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 8,
  },
  xpSubText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 3,
  }
});
