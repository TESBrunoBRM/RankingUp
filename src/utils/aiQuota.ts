import { Alert } from 'react-native';
import { ApiRequestError } from '../services/rankingUpApiClient';

export function showAiQuotaError(error: unknown, openPlan: () => void): boolean {
  if (!(error instanceof ApiRequestError) || error.code !== 'AI_QUOTA_EXHAUSTED') return false;
  Alert.alert('Tus usos de IA', error.message, [{ text: 'Ahora no', style: 'cancel' }, { text: 'Ver mi plan', onPress: openPlan }]);
  return true;
}
