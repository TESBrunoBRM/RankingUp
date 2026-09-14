export const AUTH_CALLBACK_URL = 'rankingup://auth/callback';

export type AuthCallback =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'error'; code: string };

export const parseAuthCallback = (rawUrl: string): AuthCallback | null => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'rankingup:' || url.hostname !== 'auth' || url.pathname !== '/callback') return null;

  const fragment = new URLSearchParams(url.hash.slice(1));
  const value = (key: string) => fragment.get(key) ?? url.searchParams.get(key);
  const errorCode = value('error_code') ?? value('error');
  if (errorCode) return { kind: 'error', code: errorCode };

  const accessToken = value('access_token');
  const refreshToken = value('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

  const code = value('code');
  if (code) return { kind: 'code', code };
  return { kind: 'error', code: 'missing_credentials' };
};
