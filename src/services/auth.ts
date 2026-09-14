import { getSupabaseClient } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { AUTH_CALLBACK_URL, parseAuthCallback } from '../utils/authCallback';

export type SocialProvider = 'google' | 'facebook';

WebBrowser.maybeCompleteAuthSession();

let pendingCallback: { url: string; promise: Promise<boolean> } | null = null;
let completedCallbackUrl: string | null = null;

const completeAuthCallback = async (url: string): Promise<boolean> => {
  const callback = parseAuthCallback(url);
  if (!callback) return false;
  if (url === completedCallbackUrl) return true;
  if (pendingCallback?.url === url) return pendingCallback.promise;

  const promise = (async () => {
    if (callback.kind === 'error') {
      throw new Error(callback.code === 'otp_expired'
        ? 'El enlace expiró. Solicita un correo nuevo.'
        : 'No se pudo validar el enlace. Solicita uno nuevo e inténtalo otra vez.');
    }
    const supabase = getSupabaseClient();
    const { error } = callback.kind === 'tokens'
      ? await supabase.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken })
      : await supabase.auth.exchangeCodeForSession(callback.code);
    if (error) throw error;
    completedCallbackUrl = url;
    return true;
  })();
  pendingCallback = { url, promise };
  try {
    return await promise;
  } finally {
    if (pendingCallback?.promise === promise) pendingCallback = null;
  }
};

export const authService = {
  async login(email: string, password: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data;
  },

  async register(email: string, password: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
    });
    if (error) throw error;
    return data;
  },

  async resendConfirmation(email: string) {
    const { error } = await getSupabaseClient().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
    });
    if (error) throw error;
  },

  completeAuthCallback,

  async loginWithProvider(provider: SocialProvider): Promise<boolean> {
    const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('No se pudo abrir el proveedor de inicio de sesión.');
    const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);
    if (result.type !== 'success') return false;
    return completeAuthCallback(result.url);
  },

  async logout() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    completedCallbackUrl = null;
  },
};
