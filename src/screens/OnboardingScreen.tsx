import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useState } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { AppStackParamList, GenderType, GoalType } from '../types';
import { SafetyNotice } from '../components/SafetyNotice';

export default function OnboardingScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Onboarding'>>();
  
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderType>('hombre');
  const [goal, setGoal] = useState<GoalType>('mantener');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const w = Number(weight.trim().replace(',', '.'));
    const h = Number(height.trim().replace(',', '.'));
    const a = Number(age.trim());

    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isInteger(a) || w < 30 || w > 300 || h < 100 || h > 250 || a < 18 || a > 100) {
      Alert.alert('Revisa tus datos', 'Peso: 30–300 kg. Estatura: 100–250 cm. Edad: 18–100 años, sin decimales. Los menores deben consultar a un profesional para definir su alimentación.');
      return;
    }

    setLoading(true);
    try {
      await rankingUpApiClient.completeOnboarding({
        weight: w,
        height: h,
        age: a,
        gender,
        goal,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'NutritionTab' } }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron guardar tus datos.';
      Alert.alert('Error', message);
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
          <TouchableOpacity accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center', marginBottom: 12 }} onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16 }}>‹ Volver sin calcular una meta</Text></TouchableOpacity>
          <Text style={styles.title}>TU PERFIL FÍSICO</Text>
          <Text style={styles.subtitle}>Este paso es opcional. Estos datos permiten estimar una meta calórica para adultos; no sustituyen una evaluación profesional. Puedes usar el registro sin calcularla.</Text>
          <SafetyNotice kind="nutrition" />

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
            title="GUARDAR META ESTIMADA"
            onPress={handleSave} 
            loading={loading} 
            style={{ marginTop: 32 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: theme.accent, marginBottom: 8, fontStyle: 'italic', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 32, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex1: { flex: 1 },
  sectionLabel: { fontSize: 12, color: theme.text, fontWeight: '800', marginTop: 24, marginBottom: 12, letterSpacing: 1 },
  optionsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  optionCard: { flex: 1, minWidth: '30%', backgroundColor: theme.surface, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  optionCardSelected: { backgroundColor: theme.accentFill, borderColor: theme.accent },
  optionText: { color: theme.muted, fontSize: 12, fontWeight: '800' },
  optionTextSelected: { color: '#121212' }
});
