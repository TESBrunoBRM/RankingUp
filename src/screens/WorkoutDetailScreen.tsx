import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, Workout, WorkoutExercise, Exercise } from '../types';
import { workoutService } from '../services/workoutService';
import { workoutExerciseService } from '../services/workoutExerciseService';
import { exerciseApi } from '../services/exerciseApi';
import { Button } from '../components/Button';

type WorkoutDetailRouteProp = RouteProp<AppStackParamList, 'WorkoutDetail'>;
type WorkoutDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'WorkoutDetail'>;

interface EnrichedExercise extends WorkoutExercise {
  exerciseDetails?: Exercise;
}

export default function WorkoutDetailScreen() {
  const route = useRoute<WorkoutDetailRouteProp>();
  const navigation = useNavigation<WorkoutDetailNavigationProp>();
  const { workoutId } = route.params;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<EnrichedExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const workoutData = await workoutService.getWorkoutById(workoutId);
      setWorkout(workoutData);

      const workoutExercises = await workoutExerciseService.getWorkoutExercises(workoutId);
      
      const enriched = await Promise.all(
        workoutExercises.map(async (we) => {
          try {
            const details = await exerciseApi.getExerciseByName(we.exercise_id);
            return { ...we, exerciseDetails: details };
          } catch (error) {
            return we; 
          }
        })
      );
      setExercises(enriched);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar la rutina.');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRemoveExercise = async (id: string, name: string) => {
    Alert.alert(
      'Remover Ejercicio',
      `¿Deseas quitar ${name}?`,
      [
        { text: 'NO', style: 'cancel' },
        {
          text: 'SÍ, QUITAR',
          style: 'destructive',
          onPress: async () => {
             try {
               setLoading(true);
               await workoutExerciseService.removeExerciseFromWorkout(id);
               await fetchData(); 
             } catch (error: any) {
               Alert.alert('Error', error.message);
               setLoading(false);
             }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: EnrichedExercise }) => (
    <View style={styles.card}>
      <View style={styles.avatarBox}>
        <Text style={styles.avatarText}>
           {item.exercise_id ? item.exercise_id.charAt(0).toUpperCase() : 'E'}
        </Text>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {item.exercise_id.toUpperCase()}
        </Text>
        <Text style={styles.muscleText}>
          {item.exerciseDetails?.muscle || 'N/A'}
        </Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsNumber}>{item.sets}</Text>
          <Text style={styles.statsLabel}> SETS</Text>
          <Text style={styles.statsDivider}> • </Text>
          <Text style={styles.statsNumber}>{item.reps}</Text>
          <Text style={styles.statsLabel}> REPS</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleRemoveExercise(item.id, item.exercise_id)}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ VOLVER</Text>
        </TouchableOpacity>
      </View>

      {loading && !workout ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      ) : (
        <>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>{workout?.name}</Text>
            {workout?.description ? (
              <Text style={styles.descriptionText}>{workout.description}</Text>
            ) : null}
          </View>

          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>RUTINA VACÍA</Text>
                <Text style={styles.emptySubtext}>Agrega ejercicios para comenzar.</Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <Button 
              title="INICIAR ENTRENAMIENTO" 
              onPress={() => navigation.navigate('LogWorkout', { workoutId })}
              style={{ marginBottom: 12 }}
            />
            <Button 
              title="AÑADIR EJERCICIO" 
              variant="outline"
              onPress={() => navigation.navigate('AddExercises', { workoutId })}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 8,
    fontWeight: '500',
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    color: '#CCFF00',
    fontWeight: '900',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  muscleText: {
    fontSize: 12,
    color: '#CCFF00',
    marginBottom: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A0A0',
    marginRight: 8,
  },
  statsDivider: {
    color: '#333333',
    fontWeight: '900',
  },
  deleteButton: {
    padding: 12,
    marginLeft: 8,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '900',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#A0A0A0',
    fontSize: 14,
  },
});
