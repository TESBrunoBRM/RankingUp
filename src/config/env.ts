import Constants from 'expo-constants';

type EnvStatus = {
  isSupabaseConfigured: boolean;
  hasDemoFallbacks: boolean;
  apiProxyUrl: string | null;
};

const readEnv = (key: string): string => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const isLocalDevelopmentHost = (hostname: string): boolean => {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '10.0.2.2') return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;

  const match = hostname.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
};

const getExpoDevelopmentHost = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const authority = hostUri.replace(/^[a-z]+:\/\//i, '').split('/')[0];
  const hostname = authority.split(':')[0];
  return hostname && isLocalDevelopmentHost(hostname) ? hostname : null;
};

const resolveApiProxyUrl = (): string => {
  const configuredUrl = readEnv('EXPO_PUBLIC_RANKINGUP_API_URL');
  if (!__DEV__ || !configuredUrl.startsWith('http://')) return configuredUrl;

  const expoHost = getExpoDevelopmentHost();
  if (!expoHost) return configuredUrl;

  const configuredPort = configuredUrl.match(/:(\d+)(?:\/|$)/)?.[1] ?? '3001';
  return `http://${expoHost}:${configuredPort}`;
};

export const appEnv = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  apiProxyUrl: resolveApiProxyUrl(),
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
