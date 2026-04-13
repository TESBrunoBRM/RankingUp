import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuthStore } from '../store/authStore';
import { workoutService } from '../services/workoutService';
import { workoutExerciseService } from '../services/workoutExerciseService';
import { Button } from '../components/Button';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

const EQUIPMENT_OPTIONS = ['Casa (Sin equipo)', 'Casa (Mancuernas/Bandas)', 'Calistenia (Parque)', 'Gimnasio Pequeño', 'Gimnasio Comercial'];
const MUSCLE_OPTIONS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas', 'Abdomen'];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function AIWorkoutPlannerScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Analizando perfil...');

  // Form State
  const [equipment, setEquipment] = useState('');
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [days, setDays] = useState<number | null>(null);

  const toggleSelection = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  const executeAIPlan = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setLoadingText('Buscando al entrenador de bolsillo GEMINI...');
      
      const prompt = `
Actúa como un entrenador personal experto de élite. Diseña un programa de entrenamiento semanal enfocado en hipertrofia y fuerza.
Perfil:
- Equipo disponible: ${equipment}
- Enfoque principal: ${primaryMuscles.join(', ')}
- Enfoque secundario: ${secondaryMuscles.join(', ')}
- Duración por sesión: ${duration} minutos
- Días a la semana: ${days} días

Normas estrictas:
1. Responde ÚNICAMENTE con JSON válido, sin bloques de código markdown, sin \`\`\`json. Solo texto puro JSON.
2. Los nombres de los ejercicios deben ser nombres estandarizados en español (ej. "Press de Banca", "Sentadilla Libre", "Jalón al Pecho", "Remo con Barra").
3. El formato JSON exacto debe ser:
{
  "routineName": "Plan IA: [Nombre Épico]",
  "description": "Breve descripción",
  "workouts": [
    {
      "name": "Día 1: [Músculos]",
      "scheduled_day": "MON", 
      "exercises": [
        { "name": "Nombre Ejercicio", "sets": 4, "reps": 10 }
      ]
    }
  ]
}
Nota: "scheduled_day" debe ser MON, TUE, WED, THU, FRI, SAT o SUN. Distribuye los días lógicamente.
`.trim();

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      setLoadingText('Generando periodización y series...');
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
      
      setLoadingText('Construyendo tu plan en la base de datos...');
      const planData = JSON.parse(responseText);
      
      if (!planData.workouts || !Array.isArray(planData.workouts)) throw new Error('Respuesta AI inválida');

      // Guardar en Supabase
      for (const wo of planData.workouts) {
         const newWorkout = await workoutService.createWorkout({
           user_id: user.id,
           name: wo.name || 'Rutina Generada AI',
           description: planData.routineName + ' - ' + (planData.description || ''),
           scheduled_day: wo.scheduled_day || null
         });

         if (wo.exercises && Array.isArray(wo.exercises)) {
           let order = 0;
           for (const ex of wo.exercises) {
             await workoutExerciseService.addExerciseToWorkout({
               workout_id: newWorkout.id,
               exercise_id: ex.name, // Nombre de texto temporal, si usamos API Ninjas después se marchará por cadena
               sets: typeof ex.sets === 'number' ? ex.sets : 3,
               reps: typeof ex.reps === 'number' ? ex.reps : 10,
               order: order++
             });
           }
         }
      }

      setLoadingText('¡Listo! 🚀');
         setTimeout(() => {
         setLoading(false);
         (navigation as any).navigate('MainTabs', { screen: 'RoutineTab' });
      }, 1000);

    } catch (e: any) {
      console.error(e);
      Alert.alert('Error IA', 'Hubo un error procesando el plan. Intenta reducir los parámetros.');
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !equipment) return Alert.alert('Aviso', 'Selecciona tu equipamiento.');
    if (step === 2 && primaryMuscles.length === 0) return Alert.alert('Aviso', 'Selecciona al menos un músculo principal.');
    if (step === 3 && !duration) return Alert.alert('Aviso', 'Selecciona la duración.');
    if (step === 4 && !days) return Alert.alert('Aviso', 'Selecciona los días.');
    
    if (step === 4) {
      executeAIPlan();
    } else {
      setStep(step + 1);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <Ionicons name="sparkles" size={60} color="#CCFF00" style={{ marginBottom: 20 }} />
         <ActivityIndicator size="large" color="#CCFF00" />
         <Text style={styles.loadingTitle}>IA TRABAJANDO</Text>
         <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ {step > 1 ? 'ATRÁS' : 'CANCELAR'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>PASO {step} DE 4</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>¿DÓNDE ENTRENARÁS?</Text>
            <Text style={styles.subtitle}>Esto define los ejercicios que se incluirán en tu rutina.</Text>
            {EQUIPMENT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
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
            <Text style={styles.title}>ENFOQUE MUSCULAR</Text>
            
            <Text style={styles.sectionTitle}>MÚSCULOS PRIORITARIOS</Text>
            <View style={styles.grid}>
              {MUSCLE_OPTIONS.map(m => (
                <TouchableOpacity
                  key={'pri_'+m}
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

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>TIEMPO DISPONIBLE</Text>
            <Text style={styles.subtitle}>¿Cuánto tiempo tienes para entrenar por día?</Text>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionBtn, duration === opt && styles.optionBtnActive]}
                onPress={() => setDuration(opt)}
              >
                <Text style={[styles.optionText, duration === opt && styles.optionTextActive]}>{opt} Minutos</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>FRECUENCIA SEMANAL</Text>
            <Text style={styles.subtitle}>¿Cuántos días a la semana entrenarás?</Text>
            {DAYS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
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
        {step === 4 ? (
          <TouchableOpacity style={styles.generateBtn} onPress={nextStep}>
            <Text style={styles.generateText}>GENERAR CON IA ✨</Text>
          </TouchableOpacity>
        ) : (
          <Button title="SIGUIENTE" onPress={nextStep} />
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { padding: 8 },
  backButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  stepText: { color: '#CCFF00', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  content: { padding: 24, paddingBottom: 100 },
  stepContainer: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#A0A0A0', marginBottom: 24, fontWeight: '500' },
  sectionTitle: { fontSize: 12, color: '#888', fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  optionBtn: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  optionBtnActive: { backgroundColor: 'rgba(204,255,0,0.1)', borderColor: '#CCFF00' },
  optionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  optionTextActive: { color: '#CCFF00' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: -4 },
  gridBtn: { backgroundColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 4 },
  gridBtnActive: { backgroundColor: 'rgba(204,255,0,0.1)', borderColor: '#CCFF00' },
  gridText: { color: '#A0A0A0', fontSize: 14, fontWeight: '800' },
  gridTextActive: { color: '#CCFF00' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20, backgroundColor: '#121212' },
  generateBtn: { backgroundColor: '#1E90FF', borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  generateText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  loadingTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 20, marginBottom: 8, letterSpacing: 1 },
  loadingText: { fontSize: 14, color: '#A0A0A0', fontWeight: '500' }
});
