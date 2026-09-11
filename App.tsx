import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { envStatus } from './src/config/env';
import { getSupabaseClient, registerSupabaseAutoRefresh } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';
import AppNavigator from './src/navigation/AppNavigator';
import { getAuthErrorMessage } from './src/utils/errors';

function ConfiguredApp() {
  const { setSession, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();
    const stopAutoRefreshListener = registerSupabaseAutoRefresh();

    const restoreSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error: unknown) {
        if (!isMounted) return;

        console.warn('No se pudo restaurar la sesion:', getAuthErrorMessage(error, 'Error de autenticacion.'));
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      stopAutoRefreshListener();
    };
  }, [setLoading, setSession, setUser]);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#101114" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      {envStatus.isReady ? (
        <ConfiguredApp />
      ) : (
        <View style={styles.configurationError}>
          <View style={styles.errorMark}><Text style={styles.errorMarkText}>!</Text></View>
          <Text style={styles.errorTitle}>CONFIGURACION INCOMPLETA</Text>
          <Text style={styles.errorText}>
            RankingUp no puede iniciar porque faltan variables del entorno de compilacion.
          </Text>
          <View style={styles.missingVariables}>
            {envStatus.missingKeys.map((key) => <Text key={key} style={styles.variableName}>{key}</Text>)}
          </View>
          <Text style={styles.errorHint}>Configuralas en el entorno EAS correspondiente y genera un APK nuevo.</Text>
          <StatusBar style="light" backgroundColor="#101114" />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configurationError: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, backgroundColor: '#101114' },
  errorMark: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FF9F0A', marginBottom: 20 },
  errorMarkText: { color: '#FF9F0A', fontSize: 30, fontWeight: '900' },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  errorText: { maxWidth: 330, color: '#AAB1BA', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 10 },
  missingVariables: { alignSelf: 'stretch', marginTop: 20, padding: 14, borderRadius: 8, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#30333A' },
  variableName: { color: '#CCFF00', fontSize: 11, lineHeight: 20, fontWeight: '800', textAlign: 'center' },
  errorHint: { maxWidth: 330, color: '#747D88', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 16 },
});
