import React, { useState } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { workoutLogService } from '../services/workoutLogService';

type GoalType = 'bajar' | 'mantener' | 'subir';
type GenderType = 'hombre' | 'mujer';

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderType>('hombre');
  const [goal, setGoal] = useState<GoalType>('mantener');
  const [loading, setLoading] = useState(false);

  const calculateTargetCalories = (w: number, h: number, a: number, g: GenderType, goalType: GoalType) => {
    // Mifflin-St Jeor Equation
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr = g === 'hombre' ? bmr + 5 : bmr - 161;

    // Active multiplier (Moderatly active)
    let tdee = bmr * 1.55;

    // Apply goal
    if (goalType === 'bajar') tdee -= 500;
    if (goalType === 'subir') tdee += 500;

    return Math.round(tdee);
  };

  const handleSave = async () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);

    if (!w || !h || !a || w < 30 || w > 300 || h < 100 || h > 250 || a < 10 || a > 100) {
      Alert.alert('Datos Inválidos', 'Por favor ingresa valores reales y completos.');
      return;
    }

    setLoading(true);
    try {
      const targetCalories = calculateTargetCalories(w, h, a, gender, goal);
      
      if (user) {
        await workoutLogService.updateProfileMetrics(user.id, w, h, goal, targetCalories);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron guardar tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const renderGoalOption = (g: GoalType, label: string) => (
    <TouchableOpacity 
      style={[styles.optionCard, goal === g && styles.optionCardSelected]} 
      onPress={() => setGoal(g)}
    >
      <Text style={[styles.optionText, goal === g && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderGenderOption = (g: GenderType, label: string) => (
    <TouchableOpacity 
      style={[styles.optionCard, gender === g && styles.optionCardSelected]} 
      onPress={() => setGender(g)}
    >
      <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>TU PERFIL FÍSICO</Text>
          <Text style={styles.subtitle}>Necesitamos estos datos para calcular tu meta calórica diaria y tu progreso.</Text>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input label="PESO (KG)" keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="Ej: 75" />
            </View>
            <View style={{ width: 16 }} />
            <View style={styles.flex1}>
              <Input label="ESTATURA (CM)" keyboardType="numeric" value={height} onChangeText={setHeight} placeholder="Ej: 175" />
            </View>
          </View>

          <Input label="EDAD" keyboardType="numeric" value={age} onChangeText={setAge} placeholder="Ej: 25" />

          <Text style={styles.sectionLabel}>GÉNERO (Para el cálculo metabólico)</Text>
          <View style={styles.optionsRow}>
            {renderGenderOption('hombre', 'HOMBRE')}
            {renderGenderOption('mujer', 'MUJER')}
          </View>

          <Text style={styles.sectionLabel}>TU OBJETIVO</Text>
          <View style={styles.optionsRow}>
            {renderGoalOption('bajar', 'BAJAR PESO')}
            {renderGoalOption('mantener', 'MANTENER')}
            {renderGoalOption('subir', 'AUMENTAR')}
          </View>

          <Button 
            title="INICIAR EXPERIENCIA" 
            onPress={handleSave} 
            loading={loading} 
            style={{ marginTop: 32 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: '#CCFF00', marginBottom: 8, fontStyle: 'italic', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#A0A0A0', marginBottom: 32, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex1: { flex: 1 },
  sectionLabel: { fontSize: 12, color: '#FFFFFF', fontWeight: '800', marginTop: 24, marginBottom: 12, letterSpacing: 1 },
  optionsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  optionCard: { flex: 1, minWidth: '30%', backgroundColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  optionCardSelected: { backgroundColor: '#CCFF00', borderColor: '#CCFF00' },
  optionText: { color: '#A0A0A0', fontSize: 12, fontWeight: '800' },
  optionTextSelected: { color: '#121212' }
});
