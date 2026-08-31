import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerSupabaseAutoRefresh, supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';
import AppNavigator from './src/navigation/AppNavigator';
import { getAuthErrorMessage } from './src/utils/errors';

export default function App() {
  const { setSession, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
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
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#121212" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
