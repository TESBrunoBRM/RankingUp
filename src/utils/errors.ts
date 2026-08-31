const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  const record = isRecord(error) ? error : null;
  const status = record && typeof record.status === 'number' ? record.status : null;
  const name = error instanceof Error ? error.name : record && typeof record.name === 'string' ? record.name : '';
  const rawMessage = getErrorMessage(error, '');
  const isRetryable = name === 'AuthRetryableFetchError'
    || (status !== null && status >= 500)
    || rawMessage.includes('Network request failed')
    || /\"status\":5\d\d/.test(rawMessage);

  if (isRetryable) {
    return 'El servicio de autenticacion no esta disponible temporalmente. Revisa tu conexion e intenta nuevamente.';
  }

  return getErrorMessage(error, fallback);
};

export const getErrorDetail = (error: unknown, key: 'details' | 'hint'): string | undefined => {
  if (!isRecord(error)) return undefined;
  const value = error[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};
