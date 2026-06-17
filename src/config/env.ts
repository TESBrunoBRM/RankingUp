type EnvStatus = {
  isSupabaseConfigured: boolean;
  hasDemoFallbacks: boolean;
  apiProxyUrl: string | null;
};

const readEnv = (key: string): string => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const appEnv = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  apiProxyUrl: readEnv('EXPO_PUBLIC_RANKINGUP_API_URL'),
  enableDemoFallbacks: readEnv('EXPO_PUBLIC_ENABLE_DEMO_FALLBACKS') !== 'false',
};

export const envStatus: EnvStatus = {
  isSupabaseConfigured: Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey),
  hasDemoFallbacks: appEnv.enableDemoFallbacks,
  apiProxyUrl: appEnv.apiProxyUrl || null,
};

export const requireSupabaseEnv = () => {
  if (!envStatus.isSupabaseConfigured) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_ANON_KEY. Configuralas en .env o en EAS Secrets antes de ejecutar RankingUp.'
    );
  }

  return {
    url: appEnv.supabaseUrl,
    anonKey: appEnv.supabaseAnonKey,
  };
};
