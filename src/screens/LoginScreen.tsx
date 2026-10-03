import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { authService, type SocialProvider } from '../services/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { AuthStackParamList } from '../types';
import { getAuthErrorMessage, isEmailNotConfirmed } from '../utils/errors';
import { appEnv } from '../config/env';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(route.params?.notice ?? '');

  useEffect(() => {
    if (route.params?.email) setEmail(route.params.email);
    setNotice(route.params?.notice ?? '');
  }, [route.params?.email, route.params?.notice]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Por favor, ingresa correo y contraseña.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await authService.login(email, password);
    } catch (err: unknown) {
      if (isEmailNotConfirmed(err)) {
        navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
        return;
      }
      const message = getAuthErrorMessage(err, 'Error al iniciar sesion');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    setError('');
    setLoading(true);
    try {
      await authService.loginWithProvider(provider);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, `No se pudo iniciar sesión con ${provider}.`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>RANKINGUP</Text>
            <Text style={styles.subtitle}>INICIA SESIÓN PARA CONTINUAR</Text>

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Input
              label="CORREO ELECTRÓNICO"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="CONTRASEÑA"
              placeholder="********"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <Button
              title="INICIAR SESIÓN"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
            />

            <Button
              title="¿NO TIENES CUENTA? REGÍSTRATE"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            />

            {appEnv.googleAuthEnabled || appEnv.facebookAuthEnabled ? <>
              <Text style={styles.separator}>O CONTINÚA CON</Text>
              {appEnv.googleAuthEnabled ? <Pressable style={styles.socialButton} disabled={loading} onPress={() => void handleSocialLogin('google')}>
                <Ionicons name="logo-google" size={21} color={theme.text} /><Text style={styles.socialText}>CONTINUAR CON GOOGLE</Text>
              </Pressable> : null}
              {appEnv.facebookAuthEnabled ? <Pressable style={styles.socialButton} disabled={loading} onPress={() => void handleSocialLogin('facebook')}>
                <Ionicons name="logo-facebook" size={21} color={theme.text} /><Text style={styles.socialText}>CONTINUAR CON FACEBOOK</Text>
              </Pressable> : null}
            </> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.accent,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 40,
    fontWeight: '700',
  },
  button: {
    marginTop: 24,
    marginBottom: 12,
  },
  error: { color: theme.mode === 'light' ? '#B42318' : '#FF8A80', fontSize: 13, lineHeight: 19, marginTop: 2 },
  notice: { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 6, padding: 12, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  separator: { color: theme.muted, textAlign: 'center', fontSize: 11, fontWeight: '800', marginTop: 25, marginBottom: 14 },
  socialButton: { height: 52, borderWidth: 1, borderColor: '#3D424A', borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 },
  socialText: { color: theme.text, fontSize: 12, fontWeight: '800' },
});
