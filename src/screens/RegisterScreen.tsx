import React, { useState } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { AuthStackParamList } from '../types';
import { getAuthErrorMessage } from '../utils/errors';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await authService.register(normalizedEmail, password);
      if (!result.session) navigation.replace('VerifyEmail', { email: normalizedEmail });
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, 'Error al registrarse');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>CREAR CUENTA</Text>
            <Text style={styles.subtitle}>REGÍSTRATE PARA COMENZAR</Text>

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
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
            />

            <Input
              label="CONFIRMAR CONTRASEÑA"
              placeholder="********"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <Button
              title="REGISTRARSE"
              onPress={handleRegister}
              loading={loading}
              style={styles.button}
            />

            <Button
              title="¿YA TIENES CUENTA? INICIA SESIÓN"
              variant="outline"
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            />
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
    fontSize: 36,
    fontWeight: '900',
    color: '#CCFF00',
    marginBottom: 8,
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
});
