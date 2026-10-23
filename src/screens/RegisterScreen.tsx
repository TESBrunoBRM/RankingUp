import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useState } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { AuthStackParamList } from '../types';
import { getAuthErrorMessage } from '../utils/errors';
import { meetsPasswordRequirements, PASSWORD_MIN_LENGTH } from '../utils/password';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const passwordValid = meetsPasswordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

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
    if (!passwordValid) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!acceptedTerms) {
      setError('Debes leer y aceptar los Términos y la información de privacidad.');
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
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.passwordHelp} accessibilityLiveRegion="polite">
              <Text style={styles.passwordHeading}>Requisito mínimo</Text>
              <Text style={[styles.passwordRule, passwordValid && styles.ruleMet]}>{passwordValid ? '✓ Cumplido' : '○ Pendiente'}: al menos {PASSWORD_MIN_LENGTH} caracteres ({password.length}/{PASSWORD_MIN_LENGTH}).</Text>
              <Text style={styles.passwordTip}>Para mayor seguridad, usa una contraseña larga, única y difícil de adivinar.</Text>
            </View>

            <Input
              label="CONFIRMAR CONTRASEÑA"
              placeholder="********"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {confirmPassword ? <Text accessibilityLiveRegion="polite" style={[styles.passwordRule, passwordsMatch && styles.ruleMet]}>{passwordsMatch ? '✓ Las contraseñas coinciden.' : '○ Las contraseñas todavía no coinciden.'}</Text> : null}

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <View style={styles.termsRow}>
              <Pressable accessibilityRole="checkbox" accessibilityLabel="Aceptar términos y privacidad" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms(!acceptedTerms)} style={styles.termsCheck}>
                <Text style={styles.termsCheckText}>{acceptedTerms ? '✓' : ''}</Text>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Terms')} style={styles.termsLink}>
                <Text style={styles.termsText}>He leído y acepto los Términos y la información de privacidad. Leer documento</Text>
              </Pressable>
            </View>

            <Button
              title="REGISTRARSE"
              onPress={handleRegister}
              loading={loading}
              disabled={loading || !passwordValid || !passwordsMatch || !acceptedTerms || !email.trim()}
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
    fontSize: 36,
    fontWeight: '900',
    color: theme.accent,
    marginBottom: 8,
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
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 8 },
  termsCheck: { width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  termsCheckText: { color: theme.accent, fontWeight: '900' },
  termsLink: { flex: 1 },
  termsText: { color: theme.text, fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
  passwordHelp: { marginTop: -4, marginBottom: 20, padding: 14, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  passwordHeading: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  passwordRule: { color: theme.muted, fontSize: 14, lineHeight: 22 },
  ruleMet: { color: theme.accent },
  passwordTip: { color: theme.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
});
