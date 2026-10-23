import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { EXPERIENCE_VERSION, FEATURE_GUIDES, FEATURE_OPTIONS, NUTRITION_SAFETY, TRAINING_SAFETY, type AppFeature, type ExperiencePreferences } from '../constants/experience';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { useExperienceStore } from '../store/experienceStore';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import type { AppStackParamList } from '../types';
import { LegalTermsContent } from './LegalTermsScreen';

export function ExperienceSetup({ initial, onComplete, onCancel }: {
  initial?: ExperiencePreferences | null;
  onComplete: (preferences: ExperiencePreferences) => void;
  onCancel?: () => void;
}) {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const scroll = useRef<ScrollView>(null);
  const [features, setFeatures] = useState<AppFeature[]>(initial?.features ?? []);
  const [step, setStep] = useState(0);
  const [safe, setSafe] = useState(false);
  const [accurate, setAccurate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const guides = FEATURE_OPTIONS.filter(option => features.includes(option.id));
  const lastStep = 1 + guides.length;
  const guide = step >= 2 ? guides[step - 2] : undefined;

  const moveTo = (next: number) => {
    setError('');
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const save = async () => {
    if (saving || !safe || !accurate || !features.length) return;
    setSaving(true);
    setError('');
    try {
      const result = await rankingUpApiClient.saveExperience({
        features, safetyVersion: EXPERIENCE_VERSION,
        safetyAcknowledged: true, dataAccuracyAcknowledged: true, guideCompleted: true,
      });
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu configuración. Intenta nuevamente.');
    } finally { setSaving(false); }
  };
  const check = (value: boolean, toggle: () => void, text: string) => (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={toggle} style={styles.checkRow} disabled={saving}>
      <Ionicons name={value ? 'checkbox' : 'square-outline'} size={28} color={theme.accent} />
      <Text style={styles.checkText}>{text}</Text>
    </Pressable>
  );

  if (showTerms) return <LegalTermsContent onClose={() => setShowTerms(false)} />;

  return <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
    <View style={styles.topRow}>
      <Text style={styles.brand}>RANKINGUP / A TU RITMO</Text>
      {onCancel ? <Pressable accessibilityRole="button" onPress={onCancel} disabled={saving} style={styles.close}><Text style={styles.link}>Cancelar</Text></Pressable>
        : <Pressable accessibilityRole="button" onPress={() => void authService.logout()} disabled={saving} style={styles.close}><Text style={styles.link}>Salir</Text></Pressable>}
    </View>
    <ScrollView ref={scroll} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{step === 0 ? '01 / ELIGE' : step === 1 ? '02 / CUÍDATE' : `03 / TU GUÍA · ${step - 1} DE ${guides.length}`}</Text>
      <View style={styles.progress}>{[0, 1, 2].map(index => <View key={index} style={[styles.progressSegment, Math.min(step, 2) >= index && styles.progressActive]} />)}</View>
      <Text accessibilityRole="header" style={styles.title}>{step === 0 ? '¿Cómo quieres usar RankingUp?' : step === 1 ? 'Tu bienestar va primero' : FEATURE_GUIDES[guide!.id].title}</Text>
      <Text style={styles.subtitle}>{step === 0 ? 'Elige una o varias funciones. Verás solo lo que actives y podrás cambiarlo desde tu perfil.' : step === 1 ? 'La app ofrece información general. No evalúa si un ejercicio o una meta alimentaria son adecuados para tu salud.' : 'Conoce el primer paso antes de comenzar. Después podrás repetir esta guía desde tu perfil.'}</Text>

      {step === 0 ? <>
        {FEATURE_OPTIONS.map(option => {
          const selected = features.includes(option.id);
          return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => {
            setFeatures(current => selected ? current.filter(id => id !== option.id) : [...current, option.id]);
            setSafe(false);
            setAccurate(false);
          }} style={[styles.option, selected && styles.optionSelected]}>
            <Ionicons name={option.icon} size={30} color={theme.accent} />
            <View style={styles.optionCopy}><Text style={styles.optionTitle}>{option.title}</Text><Text style={styles.body}>{option.description}</Text></View>
            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? theme.accent : theme.muted} />
          </Pressable>;
        })}
        <Text style={styles.hint}>¿Solo quieres hacer ejercicios? Selecciona únicamente «Ejercicios y rutinas». No necesitas activar nutrición ni competir.</Text>
        <Text style={styles.hint}>Puedes ajustar la visibilidad de tu perfil en Perfil. Quitar Comunidad no oculta publicaciones anteriores.</Text>
      </> : step === 1 ? <>
        {features.includes('training') ? <View style={styles.card}><Text style={styles.cardTitle}>Ejercicios con cuidado</Text><Text style={styles.body}>{TRAINING_SAFETY}</Text></View> : null}
        {features.includes('nutrition') ? <View style={styles.card}><Text style={styles.cardTitle}>Alimentación informada</Text><Text style={styles.body}>{NUTRITION_SAFETY}</Text></View> : null}
        {features.includes('community') ? <View style={styles.card}><Text style={styles.cardTitle}>Sin presión por competir</Text><Text style={styles.body}>Los retos y rangos son opcionales. No prueban aptitud física ni justifican ignorar dolor, fatiga o indicaciones profesionales.</Text></View> : null}
        {check(safe, () => setSafe(value => !value), 'He leído los avisos de las funciones elegidas y entiendo que no sustituyen una evaluación profesional ni garantizan resultados.')}
        {check(accurate, () => setAccurate(value => !value), 'Me comprometo a proporcionar datos veraces, completos y actualizados, corregir errores y revisar las estimaciones antes de utilizarlas.')}
        <Text style={styles.hint}>Los datos incorrectos u omitidos pueden generar orientaciones inadecuadas. Eres responsable de la información que aportas en los términos permitidos por la ley. Esto no elimina tus derechos ni la responsabilidad legal de RankingUp.</Text>
        <Pressable accessibilityRole="link" onPress={() => setShowTerms(true)} style={styles.close}><Text style={styles.link}>Leer términos y privacidad</Text></Pressable>
      </> : guide ? <>
        <View style={styles.guideIcon}><Ionicons name={guide.icon} size={42} color={theme.accent} /></View>
        {FEATURE_GUIDES[guide.id].steps.map((text, index) => <View style={styles.guideRow} key={text}><Text style={styles.number}>{index + 1}</Text><Text style={styles.guideText}>{text}</Text></View>)}
        {step === lastStep ? <View style={styles.card}><Text style={styles.cardTitle}>Todo listo, sin prisa</Text><Text style={styles.body}>Tu inicio mostrará las funciones elegidas. Ve a Perfil → Mis funciones y guía para agregar o quitar funciones y repetir el recorrido. Desactivar una función no elimina tus registros.</Text></View> : null}
      </> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button title={step === lastStep ? 'GUARDAR Y COMENZAR' : step >= 2 ? 'SIGUIENTE FUNCIÓN' : 'CONTINUAR'} onPress={() => step === lastStep ? void save() : moveTo(step + 1)} disabled={saving || (step === 0 && !features.length) || (step === 1 && (!safe || !accurate))} loading={saving} />
      {step > 0 ? <Button title="ATRÁS" variant="outline" onPress={() => moveTo(step - 1)} disabled={saving} /> : null}
      {saving ? <Text accessibilityLiveRegion="polite" style={styles.hint}>Guardando tu selección y los avisos que revisaste…</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}

export default function ExperienceSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const initial = useExperienceStore(state => state.preferences);
  const userId = useAuthStore(state => state.session?.user.id);
  return <ExperienceSetup initial={initial} onCancel={() => navigation.goBack()} onComplete={preferences => {
    if (!userId || useAuthStore.getState().session?.user.id !== userId) return;
    // Leave the configuration screen before the navigator rebuilds its feature routes.
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    useExperienceStore.getState().setPreferences(userId, preferences);
  }} />;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  topRow: { paddingHorizontal: 24, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brand: { color: theme.muted, fontSize: 11, fontWeight: '800', flex: 1, letterSpacing: 1 },
  close: { minHeight: 48, justifyContent: 'center' },
  content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 620, alignSelf: 'center' },
  eyebrow: { color: theme.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 28 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  progressActive: { backgroundColor: theme.accent },
  title: { color: theme.text, fontWeight: '900', fontSize: 30, marginBottom: 14 },
  subtitle: { color: theme.muted, fontSize: 16, lineHeight: 24, marginBottom: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  optionSelected: { borderColor: theme.accent, borderWidth: 2, padding: 17 },
  optionCopy: { flex: 1 },
  optionTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  body: { color: theme.muted, fontSize: 15, lineHeight: 23 },
  hint: { color: theme.muted, fontSize: 14, lineHeight: 22, marginVertical: 16 },
  card: { padding: 18, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.surface, marginBottom: 16 },
  cardTitle: { color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, minHeight: 52 },
  checkText: { flex: 1, color: theme.text, fontSize: 15, lineHeight: 23 },
  link: { color: theme.accent, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  guideIcon: { marginBottom: 24 },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, marginBottom: 26 },
  number: { color: theme.accent, fontSize: 24, fontWeight: '900', minWidth: 24 },
  guideText: { color: theme.text, fontSize: 17, lineHeight: 26, flex: 1 },
  error: { color: theme.mode === 'light' ? '#B42318' : '#FF8A80', fontSize: 15, lineHeight: 22, marginBottom: 16 },
});
