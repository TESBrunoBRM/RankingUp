import React, { useState } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { authService, type SocialProvider } from '../services/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { AuthStackParamList } from '../types';
import { getAuthErrorMessage, isEmailNotConfirmed } from '../utils/errors';
import { appEnv } from '../config/env';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Por favor, ingresa correo y contraseña.');
      return;
    }
    setError('');
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
                <Ionicons name="logo-google" size={21} color="#FFF" /><Text style={styles.socialText}>CONTINUAR CON GOOGLE</Text>
              </Pressable> : null}
              {appEnv.facebookAuthEnabled ? <Pressable style={styles.socialButton} disabled={loading} onPress={() => void handleSocialLogin('facebook')}>
                <Ionicons name="logo-facebook" size={21} color="#FFF" /><Text style={styles.socialText}>CONTINUAR CON FACEBOOK</Text>
              </Pressable> : null}
            </> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101114',
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
    color: '#CCFF00',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 40,
    fontWeight: '700',
  },
  button: {
    marginTop: 24,
    marginBottom: 12,
  },
  error: { color: '#FF8A80', fontSize: 13, lineHeight: 19, marginTop: 2 },
  separator: { color: '#8C929A', textAlign: 'center', fontSize: 11, fontWeight: '800', marginTop: 25, marginBottom: 14 },
  socialButton: { height: 52, borderWidth: 1, borderColor: '#3D424A', borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 },
  socialText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});
