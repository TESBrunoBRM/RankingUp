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
  const code = record && typeof record.code === 'string' ? record.code : '';
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

  const messages: Record<string, string> = {
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión. Puedes reenviar el enlace desde la siguiente pantalla.',
    invalid_credentials: 'Correo o contraseña incorrectos.',
    email_address_not_authorized: 'No se pudo enviar el correo: este proyecto necesita configurar un servicio SMTP para enviar a esa dirección.',
    over_email_send_rate_limit: 'Se alcanzó el límite de correos. Espera un momento antes de reintentar.',
    otp_expired: 'El enlace expiró. Solicita un correo nuevo.',
    email_address_invalid: 'Ingresa un correo electrónico válido.',
    weak_password: 'Elige una contraseña más segura.',
  };
  if (messages[code]) return messages[code];

  return getErrorMessage(error, fallback);
};

export const isEmailNotConfirmed = (error: unknown): boolean =>
  isRecord(error) && error.code === 'email_not_confirmed';

export const getErrorDetail = (error: unknown, key: 'details' | 'hint'): string | undefined => {
  if (!isRecord(error)) return undefined;
  const value = error[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};
