import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, Exercise } from '../types';
import { exerciseApi } from '../services/exerciseApi';
import { workoutExerciseService } from '../services/workoutExerciseService';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

type AddExercisesRouteProp = RouteProp<AppStackParamList, 'AddExercises'>;
type AddExercisesNavigationProp = NativeStackNavigationProp<AppStackParamList, 'AddExercises'>;

export default function AddExercisesScreen() {
  const route = useRoute<AddExercisesRouteProp>();
  const navigation = useNavigation<AddExercisesNavigationProp>();
  const { workoutId } = route.params;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [adding, setAdding] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load default featured library on mount
    executeSearch('');
  }, []);

  const executeSearch = async (query: string) => {
    try {
      setLoading(true);
      if (!query.trim()) {
        const data = await exerciseApi.getExercises('type', 'strength');
        setExercises(data);
      } else {
        const data = await exerciseApi.getExercises('name', query.toLowerCase());
        setExercises(data);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
     executeSearch(searchQuery);
  };

  const handleAddExercise = async () => {
    if (!selectedExercise) return;
    
    const setsNum = parseInt(sets, 10);
    const repsNum = parseInt(reps, 10);
    
    if (isNaN(setsNum) || isNaN(repsNum) || setsNum <= 0 || repsNum <= 0) {
      Alert.alert('Invalido', 'Sets y Reps deben ser números mayores a 0');
      return;
    }

    try {
      setAdding(true);
      await workoutExerciseService.addExerciseToWorkout({
        workout_id: workoutId,
        exercise_id: selectedExercise.name, // Using Name as the unique ID for API Ninjas
        sets: setsNum,
        reps: repsNum,
        order: 0, 
      });
      setSelectedExercise(null);
    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      Alert.alert(
        'Diagnóstico de Error', 
        `Mensaje: ${msg}\n\nDetalles: ${error.details || 'Ninguno'}\n\nHint: ${error.hint || 'Ninguno'}\n\nPor favor envíame captura de esto.`
      );
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => setSelectedExercise(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarBox]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.exerciseName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.muscleText}>{item.muscle}</Text>
        <Text style={styles.equipmentText}>{item.equipment} • {item.difficulty}</Text>
      </View>
      <View style={styles.addButtonIcon}>
        <Text style={styles.addButtonIconText}>+</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ CANCELAR</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.mainTitle}>BIBLIOTECA</Text>
      
      <View style={styles.searchContainer}>
        <TextInput 
           style={styles.searchInput}
           placeholder="Buscar ejercicio (ej: curl, squad...)"
           placeholderTextColor="#666"
           value={searchQuery}
           onChangeText={setSearchQuery}
           onSubmitEditing={handleSearchSubmit}
           returnKeyType="search"
           autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
         {searchQuery ? 'RESULTADOS DE BÚSQUEDA' : 'KINÉTIC CLASSICS / API NINJAS'}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
        />
      )}

      {/* Modal */}
      <Modal
        visible={!!selectedExercise}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExercise(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>CONFIGURAR</Text>
            <Text style={styles.modalSubtitle}>{selectedExercise?.name}</Text>
            
            {selectedExercise?.gifUrl ? (
              <View style={{alignItems: 'center', marginBottom: 16}}>
                <Image 
                  source={{ uri: selectedExercise.gifUrl }} 
                  style={{ width: '100%', height: 180, borderRadius: 12, backgroundColor: '#FFF' }} 
                  resizeMode="contain" 
                />
              </View>
            ) : (
              <View style={{ width: '100%', height: 140, borderRadius: 12, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#333' }}>
                 <Text style={{fontSize: 40}}>🏋️</Text>
                 <Text style={{color: '#666', marginTop: 10, fontSize: 11, fontWeight: '800', letterSpacing: 1}}>SIN PREVISUALIZACIÓN VISUAL</Text>
              </View>
            )}

            {selectedExercise?.instructions && (
              <ScrollView style={{maxHeight: 120, marginBottom: 16}}>
                <Text style={{color: '#A0A0A0', fontSize: 13, lineHeight: 18}}>
                  {selectedExercise.instructions}
                </Text>
              </ScrollView>
            )}

            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Input
                  label="SETS"
                  keyboardType="numeric"
                  value={sets}
                  onChangeText={setSets}
                  maxLength={2}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={styles.inputWrapper}>
                <Input
                  label="REPS"
                  keyboardType="numeric"
                  value={reps}
                  onChangeText={setReps}
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              {adding ? (
                 <View style={styles.center}>
                   <ActivityIndicator color="#CCFF00" size="large"/>
                 </View>
              ) : (
                <Button
                  title="AÑADIR A RUTINA"
                  onPress={handleAddExercise}
                />
              )}
               <Button
                  title="VOLVER"
                  variant="outline"
                  onPress={() => setSelectedExercise(null)}
                  disabled={adding}
                />
            </View>
          </View>
        </View>
      </Modal>
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
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    paddingHorizontal: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
  },
  searchBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#CCFF00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    paddingHorizontal: 24,
    marginBottom: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  list: {
    padding: 20,
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
    backgroundColor: '#2A2A2A',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  muscleText: {
    fontSize: 12,
    color: '#CCFF00',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  equipmentText: {
    fontSize: 11,
    color: '#A0A0A0',
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  addButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addButtonIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CCFF00',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#CCFF00',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 24,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
  },
  modalButtons: {
    marginTop: 8,
  },
});
