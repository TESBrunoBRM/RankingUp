import { Platform } from 'react-native';
import { appEnv } from '../config/env';

let showing = false;
let initialization: Promise<unknown> | null = null;

export async function openAdPrivacyOptions() {
  const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } = await import(
    'react-native-google-mobile-ads'
  );
  const info = await AdsConsent.getConsentInfo();
  if (info.privacyOptionsRequirementStatus !== AdsConsentPrivacyOptionsRequirementStatus.REQUIRED)
    return false;
  await AdsConsent.showPrivacyOptionsForm();
  return true;
}

export async function showRewardedAd(
  userId: string,
  challengeId: string,
  testMode: boolean,
  signal?: AbortSignal,
): Promise<boolean> {
  if (showing) throw new Error('Ya hay un anuncio en curso.');
  if (Platform.OS !== 'android' && Platform.OS !== 'ios')
    throw new Error('Los anuncios están disponibles en la app móvil.');
  showing = true;
  try {
    const {
      default: mobileAds,
      AdsConsent,
      RewardedAd,
      RewardedAdEventType,
      AdEventType,
      TestIds,
    } = await import('react-native-google-mobile-ads');
    const unit = testMode
      ? TestIds.REWARDED
      : Platform.OS === 'android'
        ? appEnv.admobAndroidUnit
        : appEnv.admobIosUnit;
    if (!unit) throw new Error('Los anuncios todavía no están configurados.');
    const consent = await AdsConsent.gatherConsent();
    if (!consent.canRequestAds)
      throw new Error('No hay un anuncio disponible con tus preferencias de privacidad.');
    initialization ??= mobileAds()
      .initialize()
      .catch((error) => {
        initialization = null;
        throw error;
      });
    await initialization;
    if (signal?.aborted) throw new Error('Anuncio cancelado.');
    const ad = RewardedAd.createForAdRequest(unit, {
      requestNonPersonalizedAdsOnly: true,
      serverSideVerificationOptions: { userId, customData: challengeId },
    });
    return await new Promise<boolean>((resolve, reject) => {
      let earned = false;
      let settled = false;
      const subscriptions: Array<() => void> = [];
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        subscriptions.forEach((unsubscribe) => unsubscribe());
        if (error) reject(error);
        else resolve(earned);
      };
      const timeout = setTimeout(
        () => finish(new Error('El anuncio no estuvo disponible a tiempo. Intenta más tarde.')),
        180_000,
      );
      const abort = () => finish(new Error('Anuncio cancelado.'));
      signal?.addEventListener('abort', abort, { once: true });
      subscriptions.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (signal?.aborted) abort();
          else void ad.show().catch((error) => finish(error));
        }),
      );
      subscriptions.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
      );
      subscriptions.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish()));
      subscriptions.push(ad.addAdEventListener(AdEventType.ERROR, (error) => finish(error)));
      ad.load();
    });
  } finally {
    showing = false;
  }
}
