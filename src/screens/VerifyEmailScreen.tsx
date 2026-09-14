import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import type { AuthStackParamList } from '../types';
import { getAuthErrorMessage } from '../utils/errors';

export default function VerifyEmailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>>();
  const { email } = useRoute<RouteProp<AuthStackParamList, 'VerifyEmail'>>().params;
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setMessage('');
    try {
      await authService.resendConfirmation(email);
      setMessage('Enlace enviado. Revisa también la carpeta de spam.');
      setCooldown(60);
    } catch (error: unknown) {
      setMessage(getAuthErrorMessage(error, 'No se pudo reenviar el correo.'));
    } finally {
      setSending(false);
    }
  };

  return <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
    <Pressable onPress={() => navigation.navigate('Login')} style={styles.back} accessibilityLabel="Volver a iniciar sesión">
      <Ionicons name="arrow-back" size={24} color="#FFF" />
    </Pressable>
    <View style={styles.content}>
      <Ionicons name="mail-outline" size={48} color="#CCFF00" />
      <Text style={styles.title}>REVISA TU CORREO</Text>
      <Text style={styles.description}>Abre el enlace de confirmación enviado a:</Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.description}>Al tocar el enlace, RankingUp se abrirá automáticamente.</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable onPress={() => void resend()} disabled={sending || cooldown > 0} style={[styles.resend, (sending || cooldown > 0) && styles.disabled]}>
        <Text style={styles.resendText}>{sending ? 'ENVIANDO...' : cooldown > 0 ? `REENVIAR EN ${cooldown} S` : 'REENVIAR ENLACE'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Login')} style={styles.login}>
        <Text style={styles.loginText}>VOLVER A INICIAR SESIÓN</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#101114' },
  back: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 70 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 22, textAlign: 'center' },
  description: { color: '#AAB1BA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 14 },
  email: { color: '#CCFF00', fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  message: { color: '#FFF', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 18 },
  resend: { alignSelf: 'stretch', backgroundColor: '#CCFF00', borderRadius: 6, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  disabled: { opacity: 0.5 },
  resendText: { color: '#101114', fontSize: 13, fontWeight: '900' },
  login: { paddingVertical: 18, marginTop: 12 },
  loginText: { color: '#AAB1BA', fontSize: 12, fontWeight: '800' },
});
