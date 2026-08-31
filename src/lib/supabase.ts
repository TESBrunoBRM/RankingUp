import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import { requireSupabaseEnv } from '../config/env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabaseEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

export const registerSupabaseAutoRefresh = (): (() => void) => {
  if (Platform.OS === 'web') return () => undefined;

  const updateAutoRefresh = (state: string) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
      return;
    }

    supabase.auth.stopAutoRefresh();
  };

  updateAutoRefresh(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateAutoRefresh);

  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
};
