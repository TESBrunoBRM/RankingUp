import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { PurchasesPackage } from 'react-native-purchases';
import { ProfilePage } from '../components/ProfilePage';
import { Button } from '../components/Button';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { purchaseService } from '../services/purchaseService';
import { showRewardedAd, openAdPrivacyOptions } from '../services/rewardedAdsService';
import { useAuthStore } from '../store/authStore';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import type { BillingStatus } from '../types/billing';
import { getErrorMessage } from '../utils/errors';

export default function BillingScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemePalette();
  const userId = useAuthStore((state) => state.user?.id);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingReward, setPendingReward] = useState<string | null>(null);
  const adAbort = useRef<AbortController | null>(null);
  useEffect(() => () => adAbort.current?.abort(), []);
  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const next = await rankingUpApiClient.getBilling();
      setStatus(next);
      setPackages(
        next.purchasesReady && purchaseService.configuredKey && userId
          ? await purchaseService.packages(userId, next.mode === 'test')
          : [],
      );
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar tu plan.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const purchase = async (item?: PurchasesPackage) => {
    if (!userId || busy) return;
    setBusy(true);
    setError('');
    try {
      if (item) await purchaseService.purchase(userId, item, status?.mode === 'test');
      else await purchaseService.restore(userId, status?.mode === 'test');
      if (useAuthStore.getState().user?.id !== userId)
        throw new Error(
          'La cuenta cambió durante la operación. La compra se comprobará desde la cuenta original.',
        );
      const next = await rankingUpApiClient.syncPurchase();
      setStatus(next);
      if (next.plan !== 'pro')
        setError(
          'La tienda todavía no confirmó una suscripción Pro activa. Puedes volver a comprobarla con Restaurar compras.',
        );
    } catch (err) {
      if (!(err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled))
        setError(getErrorMessage(err, 'No se pudo completar la compra.'));
    } finally {
      setBusy(false);
    }
  };
  const checkReward = async (id: string) => {
    const result = await rankingUpApiClient.getReward(id);
    if (result.credited) {
      setPendingReward(null);
      setStatus(await rankingUpApiClient.getBilling());
      Alert.alert(
        'Uso recuperado',
        'Ya tienes un uso adicional para alimentación o planificación.',
      );
    } else if (Date.parse(result.expiresAt) < Date.now()) {
      setPendingReward(null);
      setError('La recompensa no fue confirmada a tiempo. Intenta nuevamente más tarde.');
    } else
      setError('Google todavía no confirmó la recompensa. Comprueba el estado en unos segundos.');
  };
  const reward = async () => {
    if (!userId || !status || busy) return;
    setBusy(true);
    setError('');
    try {
      if (pendingReward) {
        await checkReward(pendingReward);
        return;
      }
      const challenge = await rankingUpApiClient.createReward();
      adAbort.current = new AbortController();
      const earned = await showRewardedAd(
        userId,
        challenge.id,
        status.mode === 'test',
        adAbort.current.signal,
      );
      if (earned) {
        setPendingReward(challenge.id);
        await checkReward(challenge.id);
      } else setError('El anuncio se cerró sin completar la recompensa. Tu saldo se mantiene.');
    } catch (err) {
      setError(getErrorMessage(err, 'No hay un anuncio disponible. Tu saldo se mantiene.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ProfilePage title="Mi plan" loading={loading} error={error} onRetry={() => void load()}>
      {status ? (
        <>
          {status.mode !== 'live' ? (
            <View style={styles.testNotice}>
              <Text style={styles.small}>
                {status.mode === 'test'
                  ? 'Entorno de pruebas · Sin cobros reales'
                  : 'Planes en preparación · Todavía sin cobros ni límites activos'}
              </Text>
            </View>
          ) : null}
          <View style={styles.balance}>
            <Text style={styles.eyebrow}>
              {status.plan === 'pro' ? 'RANKINGUP PRO' : 'RANKINGUP GRATIS'}
            </Text>
            <Text style={styles.number}>
              {status.plan === 'pro'
                ? 'Sin límite'
                : status.remaining === null
                  ? '3 al mes'
                  : status.remaining === 1
                    ? '1 disponible'
                    : `${status.remaining} disponibles`}
            </Text>
            <Text style={styles.body}>
              {status.plan === 'pro'
                ? 'Tu IA no tiene una cuota mensual.'
                : 'Usos compartidos entre planificación de entrenamientos y análisis de alimentos. Cada resultado completado consume 1 uso.'}
            </Text>
            {status.resetsAt && status.plan === 'free' ? (
              <Text style={styles.small}>
                Se renuevan el{' '}
                {new Date(status.resetsAt).toLocaleDateString('es-CL', {
                  timeZone: 'America/Santiago',
                })}
                . Los usos no se acumulan entre meses.
              </Text>
            ) : null}
          </View>
          {status.plan === 'free' ? (
            <>
              <Button
                title={pendingReward ? 'Comprobar recompensa' : 'Ver anuncio · Recuperar 1 uso'}
                variant="secondary"
                loading={busy}
                disabled={
                  !status.rewardsReady ||
                  (!pendingReward && (status.remaining === null || status.remaining >= 3))
                }
                onPress={() => void reward()}
              />
              <Text style={styles.small}>
                {status.rewardsReady
                  ? 'El anuncio es opcional. El uso se acredita cuando Google confirma la recompensa, hasta un saldo de 3.'
                  : 'Los anuncios con recompensa estarán disponibles cuando terminemos de configurar el proveedor.'}
              </Text>
            </>
          ) : null}
          <View style={styles.plan}>
            <Text style={styles.title}>Gratis, para tu día a día</Text>
            <Text style={styles.body}>
              Entrenamientos manuales, alimentación básica e historial. Privacidad y avisos de
              seguridad incluidos.
            </Text>
          </View>
          <View style={[styles.plan, styles.pro]}>
            <Text style={styles.eyebrow}>RANKINGUP PRO</Text>
            <Text style={styles.title}>Más espacio para tu IA</Text>
            <Text style={styles.body}>
              Planificación y alimentación con IA sin la cuota de 3 usos mensuales.
            </Text>
            {status.plan === 'pro' ? (
              <Text style={styles.active}>Tu plan está activo</Text>
            ) : packages.length ? (
              packages.map((item) => (
                <Button
                  key={item.identifier}
                  title={`${item.packageType === 'ANNUAL' ? 'Anual' : 'Mensual'} · ${item.product.priceString}`}
                  loading={busy}
                  onPress={() => void purchase(item)}
                />
              ))
            ) : (
              <>
                <Text style={styles.price}>$2.990 CLP/mes · $24.990 CLP/año</Text>
                <Text style={styles.small}>
                  Precios propuestos para validar. La contratación todavía no está habilitada.
                </Text>
              </>
            )}
            {packages.length ? (
              <Text style={styles.small}>
                Suscripción con renovación automática. El periodo y precio final se confirman en la
                tienda; puedes cancelar desde sus ajustes.
              </Text>
            ) : null}
          </View>
          {status.purchasesReady && purchaseService.configuredKey ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={styles.restore}
              onPress={() => void purchase()}
            >
              <Text style={[styles.small, { color: theme.accent }]}>Restaurar compras</Text>
            </Pressable>
          ) : null}
          <View style={styles.future}>
            <Text style={styles.body}>Disponible para todos: informe de peso con historial, objetivo y recordatorio semanal desde Informes.</Text>
            <Text style={styles.title}>Lo que viene después</Text>
            <Text style={styles.body}>
              Informes avanzados y más personalización para Pro. Más adelante: programas de
              profesionales y herramientas para entrenadores con alumnos.
            </Text>
            <Text style={styles.small}>
              Estas funciones están en desarrollo y aún no forman parte del plan disponible.
            </Text>
          </View>
          {status.rewardsReady ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={styles.restore}
              onPress={() => {
                void openAdPrivacyOptions()
                  .then((shown) => {
                    if (!shown)
                      Alert.alert(
                        'Privacidad de anuncios',
                        'No hay un formulario adicional requerido para tu región. Los anuncios se solicitan sin personalización.',
                      );
                  })
                  .catch(() => setError('No se pudieron abrir las preferencias de anuncios.'));
              }}
            >
              <Text style={styles.small}>Privacidad de anuncios</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ProfilePage>
  );
}
const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    testNotice: { padding: 12, backgroundColor: theme.surfaceAlt, borderRadius: 10 },
    small: { color: theme.muted, fontSize: 12, lineHeight: 19 },
    balance: { paddingVertical: 14, gap: 12 },
    eyebrow: { color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    number: { color: theme.text, fontSize: 33, fontWeight: '800' },
    body: { color: theme.muted, fontSize: 14, lineHeight: 22 },
    plan: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 12,
    },
    pro: { borderColor: theme.accent },
    title: { color: theme.text, fontSize: 19, fontWeight: '800' },
    price: { color: theme.text, fontSize: 16, fontWeight: '700' },
    active: { color: theme.accent, fontWeight: '700' },
    restore: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    future: { paddingVertical: 16, gap: 12 },
  });
