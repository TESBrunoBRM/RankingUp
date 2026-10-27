import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { SafetyNotice } from '../components/SafetyNotice';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList } from '../types';
import { AiUsageNotice } from '../components/AiUsageNotice';
import { showAiQuotaError } from '../utils/aiQuota';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'AIPlanning'>;

const EQUIPMENT_OPTIONS = ['Casa (Sin equipo)', 'Casa (Mancuernas)', 'Casa (Bandas)', 'Calistenia (Parque)', 'Gimnasio Pequeño', 'Gimnasio Comercial'];
const MUSCLE_OPTIONS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas', 'Abdomen'];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const GOAL_OPTIONS = [
  { value: 'strength', title: 'Fuerza', description: 'Prioriza movimientos compuestos, menos repeticiones y más descanso.' },
  { value: 'hypertrophy', title: 'Hipertrofia', description: 'Combina movimientos compuestos y accesorios para repartir el volumen muscular.' },
  { value: 'balanced', title: 'Equilibrado', description: 'Un punto de partida general para trabajar fuerza y masa muscular.' },
] as const;

export default function AIWorkoutPlannerScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Preparando tu plan...');
  const planning = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);

  // Form State
  const [equipment, setEquipment] = useState('');
  const [trainingGoal, setTrainingGoal] = useState<'strength' | 'hypertrophy' | 'balanced' | null>(null);
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const fullBodySelected = MUSCLE_OPTIONS.every(muscle => primaryMuscles.includes(muscle));

  const toggleSelection = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  const executeAIPlan = async () => {
    if (!user || planning.current) return;
    planning.current = true;
    try {
      setLoading(true);
      setLoadingText('Distribuyendo los grupos musculares de la semana...');

      const plan = await rankingUpApiClient.generateWorkoutPlan({
        equipment,
        trainingGoal: trainingGoal ?? 'balanced',
        primaryMuscles,
        secondaryMuscles,
        duration: duration ?? 45,
        days: days ?? 3,
      });

      navigation.navigate('MainTabs', { screen: 'RoutineTab' });
      if (plan.assessment?.warnings.length) Alert.alert('Plan creado: revisa estos puntos', plan.assessment.warnings.join('\n\n'));
    } catch (error) {
      if (showAiQuotaError(error, () => navigation.navigate('Billing'))) return;
      Alert.alert('No se pudo crear el plan', error instanceof Error ? error.message : 'Revisa tu conexión e intenta nuevamente.');
    } finally {
      planning.current = false;
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !equipment) return Alert.alert('Aviso', 'Selecciona tu equipamiento.');
    if (step === 2 && !trainingGoal) return Alert.alert('Aviso', 'Selecciona el objetivo de entrenamiento.');
    if (step === 3 && primaryMuscles.length === 0) return Alert.alert('Aviso', 'Selecciona al menos un músculo principal.');
    if (step === 4 && !duration) return Alert.alert('Aviso', 'Selecciona la duración.');
    if (step === 5 && !days) return Alert.alert('Aviso', 'Selecciona los días.');
    
    if (step === 5) {
      executeAIPlan();
    } else {
      setStep(step + 1);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <Ionicons name="sparkles" size={60} color={theme.accent} style={{ marginBottom: 20 }} />
         <ActivityIndicator size="large" color={theme.accent} />
         <Text style={styles.loadingTitle}>PLANIFICANDO</Text>
         <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ {step > 1 ? 'ATRÁS' : 'CANCELAR'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>PASO {step} DE 5</Text>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <AiUsageNotice />
        <SafetyNotice kind="training" />
        
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>¿DÓNDE ENTRENARÁS?</Text>
            <Text style={styles.subtitle}>Esto define los ejercicios incluidos en tu rutina. Sin equipo usa solo suelo y peso corporal. Mancuernas y bandas no requieren banco. Parque presupone una barra de dominadas; gimnasio pequeño, barras, mancuernas y banco.</Text>
            {EQUIPMENT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                accessibilityRole="radio"
                accessibilityState={{ checked: equipment === opt }}
                aria-checked={equipment === opt}
                style={[styles.optionBtn, equipment === opt && styles.optionBtnActive]}
                onPress={() => setEquipment(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, equipment === opt && styles.optionTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>¿QUÉ QUIERES PRIORIZAR?</Text>
            <Text style={styles.subtitle}>El objetivo ajusta la selección, el orden, las series, las repeticiones y los descansos. Un mismo ejercicio puede servir para fuerza e hipertrofia.</Text>
            {GOAL_OPTIONS.map(option => <TouchableOpacity key={option.value}
              accessibilityRole="radio" accessibilityState={{ checked: trainingGoal === option.value }}
              aria-checked={trainingGoal === option.value}
              accessibilityLabel={option.title}
              style={[styles.optionBtn, trainingGoal === option.value && styles.optionBtnActive]}
              onPress={() => setTrainingGoal(option.value)}>
              <Text style={[styles.optionText, trainingGoal === option.value && styles.optionTextActive]}>{option.title}</Text>
              <Text style={styles.goalDescription}>{option.description}</Text>
            </TouchableOpacity>)}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>ENFOQUE MUSCULAR</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: fullBodySelected }}
              style={[styles.optionBtn, fullBodySelected && styles.optionBtnActive]}
              onPress={() => { setPrimaryMuscles([...MUSCLE_OPTIONS]); setSecondaryMuscles([]); }}
            >
              <Text style={[styles.optionText, fullBodySelected && styles.optionTextActive]}>CUERPO COMPLETO</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>Incluye todos los grupos durante la semana: tren superior, piernas y abdomen. También puedes elegir grupos específicos abajo.</Text>
            
            <Text style={styles.sectionTitle}>MÚSCULOS PRIORITARIOS</Text>
            <View style={styles.grid}>
              {MUSCLE_OPTIONS.map(m => (
                <TouchableOpacity
                  key={'pri_'+m}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Prioritario: ${m}`}
                  accessibilityState={{ checked: primaryMuscles.includes(m) }}
                  aria-checked={primaryMuscles.includes(m)}
                  style={[styles.gridBtn, primaryMuscles.includes(m) && styles.gridBtnActive]}
                  onPress={() => {
                    toggleSelection(primaryMuscles, setPrimaryMuscles, m);
                    if (secondaryMuscles.includes(m)) toggleSelection(secondaryMuscles, setSecondaryMuscles, m);
                  }}
                >
                  <Text style={[styles.gridText, primaryMuscles.includes(m) && styles.gridTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>MÚSCULOS SECUNDARIOS (Opcional)</Text>
            <View style={styles.grid}>
              {MUSCLE_OPTIONS.map(m => (
                <TouchableOpacity
                  key={'sec_'+m}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Secundario: ${m}`}
                  accessibilityState={{ checked: secondaryMuscles.includes(m), disabled: primaryMuscles.includes(m) }}
                  aria-checked={secondaryMuscles.includes(m)}
                  disabled={primaryMuscles.includes(m)}
                  style={[styles.gridBtn, secondaryMuscles.includes(m) && styles.gridBtnActive]}
                  onPress={() => {
                    if (!primaryMuscles.includes(m)) toggleSelection(secondaryMuscles, setSecondaryMuscles, m);
                  }}
                >
                  <Text style={[styles.gridText, secondaryMuscles.includes(m) && styles.gridTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>TIEMPO DISPONIBLE</Text>
            <Text style={styles.subtitle}>¿Cuánto tiempo tienes para entrenar por día?</Text>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                accessibilityRole="radio"
                accessibilityState={{ checked: duration === opt }}
                aria-checked={duration === opt}
                style={[styles.optionBtn, duration === opt && styles.optionBtnActive]}
                onPress={() => setDuration(opt)}
              >
                <Text style={[styles.optionText, duration === opt && styles.optionTextActive]}>{opt} Minutos</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>FRECUENCIA SEMANAL</Text>
            <Text style={styles.subtitle}>¿Cuántos días a la semana entrenarás?</Text>
            <Text style={styles.subtitle}>Grupos del plan: {[...primaryMuscles, ...secondaryMuscles].join(', ')}. Se distribuirán durante la semana, sin omitir los seleccionados.</Text>
            <Text style={styles.subtitle}>Objetivo: {GOAL_OPTIONS.find(option => option.value === trainingGoal)?.title}. Equipo: {equipment}. La duración incluye una estimación de preparación, series y descansos.</Text>
            {DAYS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                accessibilityRole="radio"
                accessibilityState={{ checked: days === opt }}
                aria-checked={days === opt}
                style={[styles.optionBtn, days === opt && styles.optionBtnActive]}
                onPress={() => setDays(opt)}
              >
                <Text style={[styles.optionText, days === opt && styles.optionTextActive]}>{opt} Días / Semana</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        {step === 5 ? (
          <TouchableOpacity accessibilityRole="button" style={styles.generateBtn} onPress={nextStep}>
            <Text style={styles.generateText}>GENERAR PLAN</Text>
          </TouchableOpacity>
        ) : (
          <Button title="SIGUIENTE" onPress={nextStep} />
        )}
      </View>

    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { padding: 8 },
  backButtonText: { color: theme.muted, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  stepText: { color: theme.accent, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  content: { padding: 24, paddingBottom: 100 },
  stepContainer: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 24, fontWeight: '500' },
  sectionTitle: { fontSize: 12, color: theme.muted, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  optionBtn: { backgroundColor: theme.surface, padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  optionBtnActive: { backgroundColor: 'rgba(204,255,0,0.1)', borderColor: theme.accent },
  optionText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  optionTextActive: { color: theme.accent },
  goalDescription: { color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: -4 },
  gridBtn: { backgroundColor: theme.surface, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.border, marginBottom: 4 },
  gridBtnActive: { backgroundColor: 'rgba(204,255,0,0.1)', borderColor: theme.accent },
  gridText: { color: theme.muted, fontSize: 14, fontWeight: '800' },
  gridTextActive: { color: theme.accent },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20, backgroundColor: theme.background },
  generateBtn: { backgroundColor: '#1E90FF', borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  generateText: { color: theme.text, fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  loadingTitle: { fontSize: 24, fontWeight: '900', color: theme.text, marginTop: 20, marginBottom: 8, letterSpacing: 1 },
  loadingText: { fontSize: 14, color: theme.muted, fontWeight: '500' }
});
