import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../services/auth';
import { workoutService } from '../services/workoutService';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AppStackParamList } from '../types';

type CreateNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CreateWorkout'>;

const DAYS = [
  { id: 'MON', label: 'LUN' },
  { id: 'TUE', label: 'MAR' },
  { id: 'WED', label: 'MIÉ' },
  { id: 'THU', label: 'JUE' },
  { id: 'FRI', label: 'VIE' },
  { id: 'SAT', label: 'SÁB' },
  { id: 'SUN', label: 'DOM' },
];

export default function CreateWorkoutScreen() {
  const navigation = useNavigation<CreateNavigationProp>();
  const { user } = useAuthStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDay, setScheduledDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Atención', 'El nombre de la rutina es obligatorio.');
      return;
    }
    
    if (!user) {
      Alert.alert('Error', 'No se encontró sesión de usuario');
      return;
    }

    try {
      setCreating(true);
      const newWorkout = await workoutService.createWorkout({
        user_id: user.id, 
        name, 
        description, 
        scheduled_day: scheduledDay
      });
      Alert.alert('Éxito', '¡Rutina creada con éxito!');
      // Navigate to the detail screen so they can add exercises
      navigation.navigate('WorkoutDetail' as any, { workoutId: newWorkout.id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la rutina.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>NUEVA RUTINA</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.formGroup}>
            <Text style={styles.sectionLabel}>DETALLES PRINCIPALES</Text>
            <Input
              label="NOMBRE DE LA RUTINA"
              placeholder="Ej: Empuje, Pecho y Tríceps..."
              value={name}
              onChangeText={setName}
            />
            
            <Input
              label="DESCRIPCIÓN (Opcional)"
              placeholder="Ej: Rutina de hipertrofia focalizada..."
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.sectionLabel}>DÍA ASIGNADO (Opcional)</Text>
            <Text style={styles.helperText}>Asigna un día de la semana para que aparezca en tu Weekly Routine del Home.</Text>
            
            <View style={styles.daysGrid}>
              {DAYS.map(day => {
                const isSelected = scheduledDay === day.id;
                return (
                  <TouchableOpacity
                    key={day.id}
                    style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                    onPress={() => setScheduledDay(isSelected ? null : day.id)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="GUARDAR Y CONTINUAR"
              onPress={handleCreate}
              loading={creating}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#CCFF00',
    letterSpacing: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A0A0A0',
    marginBottom: 16,
    letterSpacing: 1,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  dayText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dayTextSelected: {
    color: '#121212',
  },
  footer: {
    marginTop: 20,
  },
});
