import { Platform } from 'react-native';
import { appEnv } from '../config/env';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAuthStore } from '../store/authStore';

let configured = false;
let currentUser: string | null = null;
let identityQueue: Promise<unknown> = Promise.resolve();
let actionQueue: Promise<unknown> = Promise.resolve();
const serial = <T>(action: () => Promise<T>): Promise<T> => {
  const result = actionQueue.catch(() => undefined).then(action);
  actionQueue = result;
  return result;
};

export const purchaseService = {
  get configuredKey() {
    return Platform.OS === 'android'
      ? appEnv.revenuecatAndroidKey
      : Platform.OS === 'ios'
        ? appEnv.revenuecatIosKey
        : '';
  },
  async identify(userId: string, testMode: boolean) {
    if (!this.configuredKey) throw new Error('Las compras todavía no están configuradas.');
    const key = this.configuredKey;
    if (
      testMode
        ? !key.startsWith('test_')
        : !key.startsWith(Platform.OS === 'android' ? 'goog_' : 'appl_')
    ) {
      throw new Error(
        testMode
          ? 'Las pruebas requieren la clave pública de RevenueCat Test Store. No se iniciará una compra real.'
          : 'La clave pública no corresponde a la tienda de esta app.',
      );
    }
    const { default: Purchases } = await import('react-native-purchases');
    const next = identityQueue
      .catch(() => undefined)
      .then(async () => {
        if (useAuthStore.getState().user?.id !== userId)
          throw new Error('La cuenta cambió. Vuelve a abrir Mi plan.');
        if (!configured) {
          Purchases.configure({ apiKey: key, appUserID: userId });
          configured = true;
        } else if (currentUser !== userId) await Purchases.logIn(userId);
        currentUser = userId;
      });
    identityQueue = next;
    await next;
    return Purchases;
  },
  async packages(userId: string, testMode: boolean): Promise<PurchasesPackage[]> {
    return serial(async () => {
      const purchases = await this.identify(userId, testMode);
      const offerings = await purchases.getOfferings();
      return (
        offerings.current?.availablePackages.filter(
          (item) => item.packageType === 'MONTHLY' || item.packageType === 'ANNUAL',
        ) ?? []
      );
    });
  },
  async purchase(userId: string, item: PurchasesPackage, testMode: boolean) {
    return serial(async () => {
      const purchases = await this.identify(userId, testMode);
      await purchases.purchasePackage(item);
      // Entitlements are verified with RevenueCat by our API; CustomerInfo never unlocks server access.
    });
  },
  async restore(userId: string, testMode: boolean) {
    return serial(async () => {
      const purchases = await this.identify(userId, testMode);
      await purchases.restorePurchases();
    });
  },
};
