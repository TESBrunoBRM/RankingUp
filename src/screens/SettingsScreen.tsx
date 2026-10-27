import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types';
import { ProfilePage, createProfileStyles } from '../components/ProfilePage';
import { SafetyNotice } from '../components/SafetyNotice';
import { useEnabledFeatures } from '../store/experienceStore';
import { useThemePalette, useThemeStore, useThemedStyles } from '../theme';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { authService } from '../services/auth';
import { getErrorMessage } from '../utils/errors';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const styles = useThemedStyles(createProfileStyles);
  const theme = useThemePalette();
  const { training, nutrition } = useEnabledFeatures();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const loadPrivacy = useCallback(async () => {
    setLoadingPrivacy(true);
    setError('');
    try {
      setIsPublic((await rankingUpApiClient.getOwnProfile()).profile.isPublic);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar tu privacidad.'));
    } finally {
      setLoadingPrivacy(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadPrivacy();
    }, [loadPrivacy]),
  );
  const updatePrivacy = async (next: boolean) => {
    if (savingPrivacy || isPublic === null) return;
    setSavingPrivacy(true);
    setError('');
    try {
      const result = await rankingUpApiClient.updateProfilePrivacy(next);
      setIsPublic(result.isPublic);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No se pudo guardar la privacidad. Tu configuración anterior se conserva.',
        ),
      );
    } finally {
      setSavingPrivacy(false);
    }
  };
  const logout = async () => {
    setLoggingOut(true);
    setError('');
    try {
      await authService.logout();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cerrar la sesión.'));
    } finally {
      setLoggingOut(false);
    }
  };
  const row = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    detail?: string,
  ) => (
    <Pressable accessibilityRole="button" style={styles.settingsRow} onPress={onPress}>
      <Ionicons name={icon} size={21} color={theme.text} />
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDescription}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
  );
  return (
    <ProfilePage
      title="Ajustes"
      error={error}
      onRetry={isPublic === null ? () => void loadPrivacy() : undefined}
    >
      <Text style={styles.sectionTitle}>TU CUENTA</Text>
      <View style={styles.group}>
        {row('Mi plan y usos de IA', 'sparkles-outline', () => navigation.navigate('Billing'))}
        {training || nutrition ? <><View style={styles.divider} />{row('Informes de peso', 'analytics-outline', () => navigation.navigate('Reports'), 'Historial, objetivo y recordatorio semanal.')}</> : null}
        <View style={styles.divider} />
        {row('Editar perfil', 'person-outline', () => navigation.navigate('EditProfile'))}
        {training || nutrition ? (
          <>
            <View style={styles.divider} />
            {row(
              'Datos físicos y objetivos',
              'body-outline',
              () => navigation.navigate('ProfileMetrics'),
              'Datos opcionales, solo para tus estimaciones.',
            )}
          </>
        ) : null}
      </View>
      <Text style={styles.sectionTitle}>TU EXPERIENCIA</Text>
      <View style={styles.group}>
        {row(
          'Funciones y guía',
          'options-outline',
          () => navigation.navigate('ExperienceSetup'),
          'Elige qué quieres usar y repasa el recorrido.',
        )}
        <View style={styles.divider} />
        <View style={styles.settingsRow}>
          <Ionicons name="color-palette-outline" size={21} color={theme.text} />
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>Tema claro</Text>
            <Text style={styles.rowDescription}>
              {mode === 'light' ? 'Activado' : 'Desactivado'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Tema claro"
            value={mode === 'light'}
            onValueChange={(value) => setMode(value ? 'light' : 'dark')}
            trackColor={{ false: theme.border, true: '#729000' }}
            thumbColor={mode === 'light' ? theme.accentFill : '#AAAAAA'}
          />
        </View>
      </View>
      <>
        <Text style={styles.sectionTitle}>PRIVACIDAD</Text>
        <View style={styles.group}>
          <View style={styles.settingsRow}>
            <Ionicons name="lock-closed-outline" size={21} color={theme.text} />
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Perfil público</Text>
              <Text style={styles.rowDescription}>
                Permite que otros atletas vean tu perfil y progreso.
              </Text>
            </View>
            {loadingPrivacy || savingPrivacy ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <Switch
                accessibilityLabel="Perfil público"
                value={isPublic === true}
                disabled={isPublic === null}
                onValueChange={(value) => void updatePrivacy(value)}
                trackColor={{ false: theme.border, true: '#729000' }}
                thumbColor={isPublic ? theme.accentFill : '#AAAAAA'}
              />
            )}
          </View>
        </View>
      </>
      <Text style={styles.sectionTitle}>AYUDA E INFORMACIÓN</Text>
      <View style={styles.group}>
        {row('Términos y privacidad', 'document-text-outline', () =>
          navigation.navigate('LegalTerms'),
        )}
        <View style={styles.divider} />
        {row('Mis envíos', 'file-tray-outline', () => navigation.navigate('MySubmissions'))}
        <View style={styles.divider} />
        {row('Reportar un problema', 'help-circle-outline', () => navigation.navigate('ReportBug'))}
      </View>
      {training ? <SafetyNotice kind="training" /> : null}
      {nutrition ? <SafetyNotice kind="nutrition" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loggingOut }}
        disabled={loggingOut}
        style={styles.settingsRow}
        onPress={() =>
          Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar sesión', style: 'destructive', onPress: () => void logout() },
          ])
        }
      >
        <Ionicons name="log-out-outline" size={21} color="#FF6C7C" />
        <Text style={[styles.rowLabel, { color: '#FF6C7C' }]}>
          {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Text>
      </Pressable>
    </ProfilePage>
  );
}
