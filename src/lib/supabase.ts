import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from '../config/env';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) return supabaseClient;

  const { url, anonKey } = requireSupabaseEnv();
  supabaseClient = createClient(url, anonKey, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  return supabaseClient;
};

export const registerSupabaseAutoRefresh = (): (() => void) => {
  if (Platform.OS === 'web') return () => undefined;
  const supabase = getSupabaseClient();

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
