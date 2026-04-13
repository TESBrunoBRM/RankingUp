import React, { useState } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { AuthStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.register(email, password);
      Alert.alert('Registro exitoso', 'Por favor revisa tu correo o inicia sesión.');
      navigation.navigate('Login');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al registrarse');
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>CREAR CUENTA</Text>
            <Text style={styles.subtitle}>REGÍSTRATE PARA COMENZAR</Text>

            <Input
              label="CORREO ELECTRÓNICO"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={error}
            />

            <Input
              label="CONTRASEÑA"
              placeholder="********"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

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
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#CCFF00',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 40,
    fontWeight: '700',
    letterSpacing: 1,
  },
  button: {
    marginTop: 24,
    marginBottom: 12,
  },
});
