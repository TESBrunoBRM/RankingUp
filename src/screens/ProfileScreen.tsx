import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StrengthLevelBadge } from '../components/StrengthLevelBadge';
import { ProfileProgressGrid } from '../components/ProfileProgressGrid';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { authService } from '../services/auth';
import type { AppStackParamList, GenderType, GoalType, SocialProfileResponse } from '../types';
import { getErrorMessage } from '../utils/errors';
import { useThemeStore } from '../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

const GOALS: Array<{ value: GoalType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'bajar', label: 'Definir', icon: 'trending-down' },
  { value: 'mantener', label: 'Mantener', icon: 'remove' },
  { value: 'subir', label: 'Volumen', icon: 'trending-up' },
];

export default function ProfileScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const [data, setData] = useState<SocialProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculatingGoal, setCalculatingGoal] = useState<GoalType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderType>('hombre');
  const [goal, setGoal] = useState<GoalType>('mantener');
  const [targetCalories, setTargetCalories] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const applyResponse = useCallback((response: SocialProfileResponse) => {
    const profile = response.profile;
    setData(response);
    setName(profile.name);
    setUsername(profile.username);
    setBio(profile.bio);
    setWeight(profile.weight?.toString() ?? '');
    setHeight(profile.height?.toString() ?? '');
    setAge(profile.age?.toString() ?? '');
    setGender(profile.gender ?? 'hombre');
    setGoal(profile.goal ?? 'mantener');
    setTargetCalories(profile.targetCalories?.toString() ?? '');
    setIsPublic(profile.isPublic);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      applyResponse(await rankingUpApiClient.getOwnProfile());
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo cargar el perfil.'));
    } finally {
      setLoading(false);
    }
  }, [applyResponse]);

  useFocusEffect(useCallback(() => {
    void fetchProfile();
  }, [fetchProfile]));

  const parseMetrics = () => ({
    weight: Number(weight),
    height: Number(height),
    age: Number(age),
  });

  const handleGoalChange = async (nextGoal: GoalType) => {
    setGoal(nextGoal);
    const metrics = parseMetrics();
    if (!metrics.weight || !metrics.height || !metrics.age) {
      setErrorMessage('Completa peso, altura y edad para calcular la meta calorica.');
      return;
    }

    try {
      setCalculatingGoal(nextGoal);
      setErrorMessage('');
      const result = await rankingUpApiClient.calculateCalorieTarget({ ...metrics, gender, goal: nextGoal });
      setTargetCalories(result.targetCalories.toString());
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo calcular la meta calorica.'));
    } finally {
      setCalculatingGoal(null);
    }
  };

  const handleGenderChange = async (nextGender: GenderType) => {
    setGender(nextGender);
    const metrics = parseMetrics();
    if (!metrics.weight || !metrics.height || !metrics.age) return;

    try {
      setCalculatingGoal(goal);
      setErrorMessage('');
      const result = await rankingUpApiClient.calculateCalorieTarget({ ...metrics, gender: nextGender, goal });
      setTargetCalories(result.targetCalories.toString());
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo calcular la meta calorica.'));
    } finally {
      setCalculatingGoal(null);
    }
  };

  const handleSave = async () => {
    const metrics = parseMetrics();
    if (!name.trim() || !username.trim() || !metrics.weight || !metrics.height || !metrics.age) {
      Alert.alert('Datos incompletos', 'Completa nombre, usuario, peso, altura y edad.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      await rankingUpApiClient.updateProfileMetrics({ ...metrics, gender, goal });
      const response = await rankingUpApiClient.updateSocialProfile({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        isPublic,
      });
      applyResponse(response);
      Alert.alert('Perfil actualizado', 'Tus datos y objetivo calorico quedaron guardados.');
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo guardar el perfil.');
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>TU PERFIL</Text>
        <Pressable accessibilityLabel="Buscar atletas" style={styles.iconButton} onPress={() => navigation.navigate('DiscoverProfiles')}>
          <Ionicons name="people-outline" size={22} color={theme.accent} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.identitySection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(name || 'R').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.displayName}>{data?.profile.name ?? 'Atleta RankingUp'}</Text>
              <Text style={styles.handle}>@{data?.profile.username ?? 'atleta'}</Text>
              {data?.profile.bio ? <Text style={styles.bio}>{data.profile.bio}</Text> : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statValue}>{data?.stats.workouts ?? 0}</Text><Text style={styles.statLabel}>SESIONES</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data?.stats.followers ?? 0}</Text><Text style={styles.statLabel}>SEGUIDORES</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data?.stats.following ?? 0}</Text><Text style={styles.statLabel}>SIGUIENDO</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data?.profile.xp ?? 0}</Text><Text style={styles.statLabel}>XP</Text></View>
          </View>

          <Pressable style={styles.discoverButton} onPress={() => navigation.navigate('DiscoverProfiles')}>
            <Ionicons name="search" size={18} color="#121212" />
            <Text style={styles.discoverText}>BUSCAR ATLETAS</Text>
          </Pressable>

          {errorMessage ? <View style={styles.errorNotice}><Ionicons name="warning-outline" size={18} color="#FFB020" /><Text style={styles.errorText}>{errorMessage}</Text></View> : null}

          <Text style={styles.sectionTitle}>IDENTIDAD</Text>
          <View style={styles.twoColumns}>
            <View style={styles.flex}><Text style={styles.label}>NOMBRE</Text><TextInput style={styles.input} value={name} onChangeText={setName} /></View>
            <View style={styles.flex}><Text style={styles.label}>USUARIO</Text><TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" /></View>
          </View>
          <Text style={styles.label}>BIO</Text>
          <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} multiline maxLength={140} />

          <View style={styles.visibilityRow}>
            <View style={styles.flex}><Text style={styles.visibilityTitle}>PERFIL PUBLICO</Text><Text style={styles.visibilityText}>Permite que otros atletas vean tus rangos y progreso.</Text></View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: '#333333', true: '#729000' }} thumbColor={isPublic ? '#CCFF00' : '#888888'} />
          </View>

          <Text style={styles.sectionTitle}>METRICAS Y OBJETIVO</Text>
          <View style={styles.twoColumns}>
            <View style={styles.flex}><Text style={styles.label}>PESO (KG)</Text><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View>
            <View style={styles.flex}><Text style={styles.label}>ALTURA (CM)</Text><TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" /></View>
          </View>
          <View style={styles.twoColumns}>
            <View style={styles.flex}><Text style={styles.label}>EDAD</Text><TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" /></View>
            <View style={styles.flex}>
              <Text style={styles.label}>SEXO DE REFERENCIA</Text>
              <View style={styles.segmented}>
                {(['hombre', 'mujer'] as GenderType[]).map((value) => (
                  <Pressable key={value} style={[styles.segment, gender === value && styles.segmentActive]} onPress={() => void handleGenderChange(value)}>
                    <Text style={[styles.segmentText, gender === value && styles.segmentTextActive]}>{value === 'hombre' ? 'HOMBRE' : 'MUJER'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>OBJETIVO</Text>
          <View style={styles.goalRow}>
            {GOALS.map((item) => (
              <Pressable key={item.value} style={[styles.goalButton, goal === item.value && styles.goalButtonActive]} onPress={() => void handleGoalChange(item.value)}>
                {calculatingGoal === item.value ? <ActivityIndicator size="small" color="#121212" /> : <Ionicons name={item.icon} size={18} color={goal === item.value ? '#121212' : '#A0A0A0'} />}
                <Text style={[styles.goalText, goal === item.value && styles.goalTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.calorieResult}>
            <View><Text style={styles.calorieLabel}>META DIARIA</Text><Text style={styles.calorieValue}>{targetCalories || '--'} kcal</Text></View>
            <Ionicons name="flame" size={28} color={theme.accent} />
          </View>

          <Text style={styles.sectionTitle}>MARCAS DE FUERZA</Text>
          {data?.strengths.length ? data.strengths.map((strength) => (
            <View key={strength.exerciseName} style={styles.strengthRow}>
              <View style={styles.flex}>
                <Text style={styles.strengthName}>{strength.exerciseName}</Text>
                <Text style={styles.strengthMeta}>1RM {strength.estimatedOneRepMax} kg · {strength.bodyweightRatio}x peso corporal</Text>
              </View>
              <StrengthLevelBadge level={strength.level} />
            </View>
          )) : (
            <View style={styles.emptyStrength}><Ionicons name="barbell-outline" size={28} color="#555555" /><Text style={styles.emptyText}>Registra entrenamientos para calcular tus rangos.</Text></View>
          )}

          {data?.profile.id ? <ProfileProgressGrid profileId={data.profile.id} /> : null}
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('WorkoutHistory')}><Text style={styles.primaryText}>HISTORIAL DE ENTRENAMIENTOS</Text></Pressable>

          <Pressable style={[styles.primaryButton, saving && styles.disabled]} disabled={saving} onPress={() => void handleSave()}>
            {saving ? <ActivityIndicator color="#121212" /> : <Text style={styles.primaryText}>GUARDAR PERFIL</Text>}
          </Pressable>
          <View style={styles.visibilityRow}>
            <View style={styles.flex}><Text style={styles.visibilityTitle}>TEMA CLARO</Text><Text style={styles.visibilityText}>Cambiar la apariencia de la aplicación.</Text></View>
            <Switch accessibilityLabel="Tema claro" value={mode === 'light'} onValueChange={(enabled) => setMode(enabled ? 'light' : 'dark')} trackColor={{ false: '#555555', true: '#8DAA2C' }} thumbColor={mode === 'light' ? '#FFFFFF' : '#CCCCCC'} />
          </View>
          <Pressable style={styles.legalLink} onPress={() => navigation.navigate('LegalTerms')}><Text style={styles.legalLinkText}>TÉRMINOS Y PRIVACIDAD</Text></Pressable>
          <Pressable style={styles.logoutButton} onPress={() => void authService.logout()}>
            <Ionicons name="log-out-outline" size={18} color="#FF5B5B" /><Text style={styles.logoutText}>CERRAR SESION</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border },
  iconButton: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
  content: { padding: 20, paddingBottom: 60 },
  identitySection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.accentFill, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#121212', fontSize: 34, fontWeight: '900' },
  identityCopy: { flex: 1 },
  displayName: { color: theme.text, fontSize: 22, fontWeight: '900' },
  handle: { color: theme.accent, fontSize: 13, fontWeight: '800', marginTop: 2 },
  bio: { color: theme.text, fontSize: 13, lineHeight: 18, marginTop: 7 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 16, marginBottom: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.text, fontSize: 17, fontWeight: '900' },
  statLabel: { color: theme.muted, fontSize: 8, fontWeight: '900', marginTop: 4 },
  discoverButton: { height: 44, borderRadius: 8, backgroundColor: theme.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  discoverText: { color: '#121212', fontSize: 12, fontWeight: '900' },
  errorNotice: { flexDirection: 'row', gap: 9, borderWidth: 1, borderColor: '#5C481A', backgroundColor: theme.warningSurface, padding: 12, borderRadius: 8, marginBottom: 18 },
  errorText: { color: theme.warningText, fontSize: 12, lineHeight: 17, flex: 1 },
  sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '900', marginTop: 12, marginBottom: 14 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  label: { color: theme.muted, fontSize: 9, fontWeight: '900', marginBottom: 7 },
  input: { height: 48, color: theme.text, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 13, marginBottom: 14 },
  bioInput: { minHeight: 76, height: 76, paddingTop: 12, textAlignVertical: 'top' },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 14, marginBottom: 20 },
  visibilityTitle: { color: theme.text, fontSize: 12, fontWeight: '900' },
  visibilityText: { color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  segmented: { flexDirection: 'row', height: 48, padding: 4, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: theme.accentFill },
  segmentText: { color: theme.muted, fontSize: 8, fontWeight: '900' },
  segmentTextActive: { color: '#121212' },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalButton: { flex: 1, minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', gap: 5 },
  goalButtonActive: { backgroundColor: theme.accentFill, borderColor: theme.accent },
  goalText: { color: theme.muted, fontSize: 10, fontWeight: '900' },
  goalTextActive: { color: '#121212' },
  calorieResult: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, marginBottom: 22 },
  calorieLabel: { color: theme.muted, fontSize: 9, fontWeight: '900' },
  calorieValue: { color: theme.text, fontSize: 25, fontWeight: '900', marginTop: 3 },
  strengthRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 12 },
  strengthName: { color: theme.text, fontSize: 14, fontWeight: '800' },
  strengthMeta: { color: theme.muted, fontSize: 11, marginTop: 5 },
  emptyStrength: { alignItems: 'center', justifyContent: 'center', minHeight: 100, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', borderRadius: 8, marginBottom: 20 },
  emptyText: { color: theme.muted, fontSize: 12, marginTop: 8 },
  primaryButton: { height: 50, backgroundColor: theme.accentFill, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: '#121212', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  logoutButton: { height: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  logoutText: { color: '#FF5B5B', fontSize: 12, fontWeight: '900' },
  legalLink: { paddingVertical: 16, alignItems: 'center' },
  legalLinkText: { color: theme.accent, fontSize: 12, fontWeight: '900' },
});
