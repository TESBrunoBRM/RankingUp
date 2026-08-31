import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { AppStackParamList, Duel } from '../types';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { joinDuelChannel, type DuelChannel } from '../services/duelRealtime';
import { useAuthStore } from '../store/authStore';
import { ALLOWED_WEBVIEW_PERMISSIONS, MINIGAME_ORIGIN, MINIGAME_URL } from '../constants/pushUpGame';
import { getErrorMessage } from '../utils/errors';

type DuelRouteProp = RouteProp<AppStackParamList, 'Duel'>;
type Navigation = NativeStackNavigationProp<AppStackParamList>;

const PENDING_POLL_MS = 5000;
const FINISHED_POLL_MS = 4000;
const PROGRESS_BROADCAST_THROTTLE_MS = 250;

type ConnectionStatus = 'connecting' | 'connected' | 'error';

export default function DuelScreen() {
  const route = useRoute<DuelRouteProp>();
  const navigation = useNavigation<Navigation>();
  const { duelId } = route.params;
  const selfUserId = useAuthStore((state) => state.session?.user.id ?? null);
  const [permission, requestPermission] = useCameraPermissions();

  const [duel, setDuel] = useState<Duel | null>(null);
  const [loading, setLoading] = useState(true);
  const [myReps, setMyReps] = useState(0);
  const [rivalReps, setRivalReps] = useState(0);
  const [rivalFinished, setRivalFinished] = useState(false);
  const [detectorState, setDetectorState] = useState<'UP' | 'DOWN'>('UP');
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [reporting, setReporting] = useState(false);

  const channelRef = useRef<DuelChannel | null>(null);
  const myRepsRef = useRef(0);
  const reportedRef = useRef(false);
  const lastBroadcastRef = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!permission) void requestPermission();
  }, [permission, requestPermission]);

  const refreshDuel = useCallback(async () => {
    try {
      const state = await rankingUpApiClient.getDuel(duelId);
      if (!isMounted.current) return state;
      setDuel(state);
      setRivalReps((current) => Math.max(current, state.rivalReps));
      if (state.rivalFinished) setRivalFinished(true);
      return state;
    } catch (error: unknown) {
      if (isMounted.current) {
        Alert.alert('Error', getErrorMessage(error, 'No se pudo cargar el duelo.'));
      }
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [duelId]);

  useEffect(() => {
    void refreshDuel();
  }, [refreshDuel]);

  // Mientras el rival no acepta, o mientras esperamos su resultado, se sondea:
  // el broadcast solo cubre la partida en si.
  useEffect(() => {
    if (!duel) return;
    const waitingToStart = duel.status === 'pending';
    const waitingForRival = duel.status === 'active' && duel.iFinished && !duel.rivalFinished;
    if (!waitingToStart && !waitingForRival) return;

    const interval = waitingToStart ? PENDING_POLL_MS : FINISHED_POLL_MS;
    const timer = setInterval(() => void refreshDuel(), interval);
    return () => clearInterval(timer);
  }, [duel, refreshDuel]);

  // Canal en vivo: solo mientras el duelo esta en curso.
  useEffect(() => {
    if (!duel || duel.status !== 'active' || !selfUserId || channelRef.current) return;

    let disposed = false;
    void joinDuelChannel(duelId, selfUserId, {
      onRivalProgress: ({ reps }) => {
        if (!isMounted.current) return;
        setRivalReps((current) => Math.max(current, reps));
      },
      onRivalFinished: ({ reps }) => {
        if (!isMounted.current) return;
        setRivalReps((current) => Math.max(current, reps));
        setRivalFinished(true);
        void refreshDuel();
      },
      onStatusChange: (status) => {
        if (isMounted.current) setConnection(status);
      },
    })
      .then((channel) => {
        if (disposed) {
          channel.leave();
          return;
        }
        channelRef.current = channel;
      })
      .catch(() => {
        if (isMounted.current) setConnection('error');
      });

    return () => {
      disposed = true;
    };
  }, [duel, duelId, selfUserId, refreshDuel]);

  useEffect(
    () => () => {
      channelRef.current?.leave();
      channelRef.current = null;
    },
    []
  );

  const submitResult = useCallback(
    async (reps: number) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setReporting(true);

      channelRef.current?.sendFinished(reps);
      try {
        const updated = await rankingUpApiClient.reportDuel(duelId, reps);
        if (isMounted.current) setDuel(updated);
      } catch (error: unknown) {
        // Si el envio falla se permite reintentar con el boton de terminar.
        reportedRef.current = false;
        if (isMounted.current) {
          Alert.alert('Error', getErrorMessage(error, 'No se pudo registrar tu resultado.'));
        }
      } finally {
        if (isMounted.current) setReporting(false);
      }
    },
    [duelId]
  );

  const handlePushUp = useCallback(() => {
    if (!duel || duel.status !== 'active' || reportedRef.current) return;

    Vibration.vibrate(60);
    const next = myRepsRef.current + 1;
    myRepsRef.current = next;
    setMyReps(next);

    const now = Date.now();
    if (now - lastBroadcastRef.current > PROGRESS_BROADCAST_THROTTLE_MS || next >= duel.targetReps) {
      lastBroadcastRef.current = now;
      channelRef.current?.sendProgress(next);
    }

    if (next >= duel.targetReps) void submitResult(next);
  }, [duel, submitResult]);

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pushup') handlePushUp();
      else if (data.type === 'state') setDetectorState(data.value);
    } catch {
      // Mensaje no reconocido del detector: se ignora.
    }
  };

  const handleForfeit = () => {
    Alert.alert('Abandonar duelo', 'Cuenta como derrota. ¿Seguro?', [
      { text: 'Seguir', style: 'cancel' },
      {
        text: 'Abandonar',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await rankingUpApiClient.forfeitDuel(duelId);
            if (isMounted.current) setDuel(updated);
          } catch (error: unknown) {
            Alert.alert('Error', getErrorMessage(error, 'No se pudo abandonar el duelo.'));
          }
        },
      },
    ]);
  };

  if (loading || !duel) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      </SafeAreaView>
    );
  }

  const isFinished = duel.status === 'finished';
  const isWaitingAccept = duel.status === 'pending';
  const isClosed = ['declined', 'cancelled', 'expired'].includes(duel.status);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ SALIR</Text>
        </TouchableOpacity>
        {duel.status === 'active' && !duel.iFinished && (
          <TouchableOpacity onPress={handleForfeit}>
            <Text style={styles.forfeitText}>ABANDONAR</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.scoreboard}>
        <View style={styles.scoreSide}>
          <Text style={styles.scoreLabel}>TÚ</Text>
          <Text style={[styles.scoreValue, { color: '#CCFF00' }]}>{Math.max(myReps, duel.myReps)}</Text>
        </View>
        <View style={styles.scoreMiddle}>
          <Text style={styles.targetLabel}>OBJETIVO</Text>
          <Text style={styles.targetValue}>{duel.targetReps}</Text>
        </View>
        <View style={styles.scoreSide}>
          <Text style={styles.scoreLabel} numberOfLines={1}>
            {duel.rival.name.toUpperCase()}
          </Text>
          <Text style={[styles.scoreValue, { color: '#FF007F' }]}>{Math.max(rivalReps, duel.rivalReps)}</Text>
        </View>
      </View>

      {isWaitingAccept && (
        <View style={styles.center}>
          <ActivityIndicator color="#CCFF00" size="large" />
          <Text style={styles.stateTitle}>ESPERANDO A {duel.rival.name.toUpperCase()}</Text>
          <Text style={styles.stateSubtitle}>
            El reto caduca automáticamente si no responde a tiempo.
          </Text>
        </View>
      )}

      {isClosed && (
        <View style={styles.center}>
          <Ionicons name="close-circle-outline" size={54} color="#FF007F" />
          <Text style={styles.stateTitle}>
            {duel.status === 'declined'
              ? 'RETO RECHAZADO'
              : duel.status === 'cancelled'
                ? 'RETO CANCELADO'
                : 'RETO CADUCADO'}
          </Text>
        </View>
      )}

      {isFinished && (
        <View style={styles.center}>
          <Ionicons
            name={duel.outcome === 'won' ? 'trophy' : duel.outcome === 'draw' ? 'remove-circle-outline' : 'sad-outline'}
            size={64}
            color={duel.outcome === 'won' ? '#CCFF00' : duel.outcome === 'draw' ? '#A0A0A0' : '#FF007F'}
          />
          <Text style={styles.resultTitle}>
            {duel.outcome === 'won' ? '¡VICTORIA!' : duel.outcome === 'draw' ? 'EMPATE' : 'DERROTA'}
          </Text>
          <Text style={styles.stateSubtitle}>
            {duel.myReps} vs {duel.rivalReps} flexiones
          </Text>
          {duel.outcome === 'won' && (
            <Text style={styles.xpText}>
              {duel.xpAwarded > 0
                ? `+${duel.xpAwarded} XP`
                : 'Sin XP: alcanzaste el máximo diario de recompensas.'}
            </Text>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('DuelLobby')}>
            <Text style={styles.primaryButtonText}>VOLVER AL LOBBY</Text>
          </TouchableOpacity>
        </View>
      )}

      {duel.status === 'active' && (
        <>
          {duel.iFinished || reportedRef.current ? (
            <View style={styles.center}>
              {reporting ? <ActivityIndicator color="#CCFF00" size="large" /> : null}
              <Text style={styles.stateTitle}>RESULTADO ENVIADO</Text>
              <Text style={styles.stateSubtitle}>
                {rivalFinished
                  ? 'Calculando el ganador...'
                  : `Esperando a que ${duel.rival.name} termine su ronda.`}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.cameraFrame}>
                <WebView
                  source={{ uri: MINIGAME_URL }}
                  style={styles.camera}
                  originWhitelist={[`${MINIGAME_ORIGIN}/*`]}
                  onShouldStartLoadWithRequest={(request) => request.url.startsWith(MINIGAME_ORIGIN)}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  onMessage={onWebViewMessage}
                  javaScriptEnabled
                  domStorageEnabled
                  onPermissionRequest={(event: any) => {
                    const requested: string[] = event.nativeEvent?.resources ?? [];
                    const allowed = requested.filter((resource) =>
                      ALLOWED_WEBVIEW_PERMISSIONS.includes(resource)
                    );
                    if (allowed.length > 0) event.grant(allowed);
                    else event.deny();
                  }}
                />
                <View
                  style={[
                    styles.detectorStatus,
                    { borderColor: detectorState === 'DOWN' ? '#CCFF00' : '#FF007F' },
                  ]}
                >
                  <Text
                    style={[
                      styles.detectorStatusText,
                      { color: detectorState === 'DOWN' ? '#CCFF00' : '#FF007F' },
                    ]}
                  >
                    {detectorState === 'DOWN' ? '¡ABAJO!' : '¡ARRIBA!'}
                  </Text>
                </View>
              </View>

              <View style={styles.footer}>
                <View style={styles.connectionRow}>
                  <View
                    style={[
                      styles.connectionDot,
                      {
                        backgroundColor:
                          connection === 'connected'
                            ? '#CCFF00'
                            : connection === 'error'
                              ? '#FF007F'
                              : '#A0A0A0',
                      },
                    ]}
                  />
                  <Text style={styles.connectionText}>
                    {connection === 'connected'
                      ? 'MARCADOR EN VIVO'
                      : connection === 'error'
                        ? 'SIN MARCADOR EN VIVO (EL DUELO SIGUE VALIENDO)'
                        : 'CONECTANDO...'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => submitResult(myRepsRef.current)}
                  disabled={reporting}
                >
                  <Text style={styles.secondaryButtonText}>TERMINAR AQUÍ</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: { paddingVertical: 8 },
  backButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  forfeitText: { color: '#FF007F', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  scoreSide: { flex: 1, alignItems: 'center' },
  scoreLabel: {
    color: '#A0A0A0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreValue: { fontSize: 40, fontWeight: '900' },
  scoreMiddle: { paddingHorizontal: 12, alignItems: 'center' },
  targetLabel: { color: '#666', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  targetValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  cameraFrame: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  camera: { flex: 1 },
  detectorStatus: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  detectorStatusText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  footer: { paddingHorizontal: 20, paddingVertical: 16 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  connectionText: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1, flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  stateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 16,
    textAlign: 'center',
  },
  stateSubtitle: {
    color: '#A0A0A0',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 16,
  },
  xpText: { color: '#CCFF00', fontSize: 14, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  primaryButton: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#CCFF00',
  },
  primaryButtonText: { color: '#121212', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF007F',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FF007F', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
