import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, Workout } from '../types';
import { workoutService } from '../services/workoutService';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/Button';

type WorkoutsScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Workouts'>;

export default function WorkoutsScreen() {
  const navigation = useNavigation<WorkoutsScreenNavigationProp>();
  const { user } = useAuthStore();
  const setPlanningMenuOpen = useUIStore(s => s.setPlanningMenuOpen);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await workoutService.getWorkouts(user.id);
      setWorkouts(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron cargar las rutinas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Eliminar',
      `¿Eliminar rutina ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await workoutService.deleteWorkout(id);
              await fetchWorkouts();
            } catch (error: any) {
              Alert.alert('Error', error.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Workout }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id, item.name)}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
      {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
      <View style={styles.cardFooter}>
         <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
         <View style={styles.enterBadge}>
           <Text style={styles.enterBadgeText}>VER</Text>
         </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ VOLVER</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setPlanningMenuOpen(true)}
        >
          <Text style={styles.createButtonText}>+ NUEVA</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.mainTitle}>MIS RUTINAS</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>SIN RUTINAS ACTIVAS</Text>
              <Button title="CREAR PRIMERA RUTINA" onPress={() => setPlanningMenuOpen(true)} style={{marginTop: 20}} />
            </View>
          }
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  createButton: {
    backgroundColor: '#CCFF00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#1A1A1A',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 15,
    color: '#A0A0A0',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  enterBadge: {
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  enterBadgeText: {
    color: '#CCFF00',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
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
    fontSize: 14,
    color: '#666666',
    fontWeight: '800',
    letterSpacing: 2,
  },
});
