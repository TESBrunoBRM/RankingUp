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

export const getErrorDetail = (error: unknown, key: 'details' | 'hint'): string | undefined => {
  if (!isRecord(error)) return undefined;
  const value = error[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};
