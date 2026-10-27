import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';

const PREFIX = 'rankingup:weight:';
const CHANNEL = 'weekly-weight';
const WEEK = 7 * 24 * 60 * 60;
let operations: Promise<unknown> = Promise.resolve();
const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
  const next = operations.then(operation, operation);
  operations = next.catch(() => undefined);
  return next;
};
const ownsSession = (userId: string) => useAuthStore.getState().session?.user.id === userId;
const allowed = (permission: Notifications.NotificationPermissionsStatus) => permission.granted
  || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

async function schedule(userId: string) {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Recordatorio semanal de peso', importance: Notifications.AndroidImportance.DEFAULT,
  });
  return Notifications.scheduleNotificationAsync({
    identifier: `${PREFIX}${userId}`,
    content: { title: 'Tu registro semanal de peso', body: '¿Cómo va tu progreso? Registra tu peso en Informes de RankingUp.',
      data: { screen: 'Reports', userId }, sound: false },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: WEEK, repeats: true, channelId: CHANNEL },
  });
}

export function syncWeightReminder(userId: string | null): Promise<boolean> {
  return serialize(async () => {
    if (Platform.OS === 'web') return false;
    const active = userId && ownsSession(userId) ? userId : null;
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of requests) {
      if (request.identifier.startsWith(PREFIX) && request.identifier !== `${PREFIX}${active}`) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    if (!active) return false;
    const enabled = await AsyncStorage.getItem(`${PREFIX}${active}`) === 'enabled';
    const permission = await Notifications.getPermissionsAsync();
    if (!enabled || !allowed(permission)) {
      await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${active}`);
      return false;
    }
    if (!requests.some(request => request.identifier === `${PREFIX}${active}`)) await schedule(active);
    return true;
  });
}

export function setWeightReminder(userId: string, enabled: boolean): Promise<boolean> {
  return serialize(async () => {
    if (Platform.OS === 'web') throw new Error('Los recordatorios están disponibles en Android e iOS.');
    if (!ownsSession(userId)) throw new Error('Vuelve a iniciar sesión.');
    if (enabled) {
      // Android 13 requires a channel before the permission prompt.
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Recordatorio semanal de peso', importance: Notifications.AndroidImportance.DEFAULT,
      });
      let permission = await Notifications.getPermissionsAsync();
      if (!allowed(permission)) permission = await Notifications.requestPermissionsAsync();
      if (!allowed(permission)) throw new Error('Activa las notificaciones de RankingUp en los ajustes del dispositivo para recibir el recordatorio.');
      if (!ownsSession(userId)) throw new Error('La sesión cambió. Inténtalo de nuevo.');
      await schedule(userId);
      try { await AsyncStorage.setItem(`${PREFIX}${userId}`, 'enabled'); }
      catch (error) { await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${userId}`); throw error; }
    } else {
      await AsyncStorage.removeItem(`${PREFIX}${userId}`);
      await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${userId}`);
    }
    return enabled;
  });
}

export function restartWeightReminder(userId: string): Promise<void> {
  return serialize(async () => {
    if (Platform.OS === 'web' || !ownsSession(userId)) return;
    if (await AsyncStorage.getItem(`${PREFIX}${userId}`) !== 'enabled') return;
    if (allowed(await Notifications.getPermissionsAsync())) {
      await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${userId}`);
      await schedule(userId);
    }
  });
}
