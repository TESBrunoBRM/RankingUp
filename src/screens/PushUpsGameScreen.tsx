import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import {
  ALLOWED_WEBVIEW_PERMISSIONS,
  MINIGAME_ORIGIN,
  MINIGAME_URL,
  MINIGAME_XP_PER_REP,
  MINIGAME_COMPLETION_BONUS,
  MINIGAME_MIN_REWARDED_REPS,
  PUSH_UP_MONSTERS,
  PUSH_UP_VICTORY_TARGET,
} from '../constants/pushUpGame';

const { width, height } = Dimensions.get('window');
const estimateXp = (reps: number): number => reps < MINIGAME_MIN_REWARDED_REPS
  ? 0
  : Math.floor(reps * MINIGAME_XP_PER_REP) + (reps >= PUSH_UP_VICTORY_TARGET ? MINIGAME_COMPLETION_BONUS : 0);

export default function PushUpsGameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();

  const [currentLevel, setCurrentLevel] = useState(0);
  const [monsterHp, setMonsterHp] = useState(PUSH_UP_MONSTERS[0].maxHp);
  const [playerReps, setPlayerReps] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [outcome, setOutcome] = useState<'completed' | 'retired' | null>(null);
  const [confirmRetirement, setConfirmRetirement] = useState(false);
  const [gainingXp, setGainingXp] = useState(false);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectorState, setDetectorState] = useState<'UP' | 'DOWN'>('UP');

  // Animation Refs
  const slashAnim = useRef(new Animated.Value(0)).current;
  const monsterShake = useRef(new Animated.Value(0)).current;
  const dmgFloat = useRef(new Animated.Value(0)).current;
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const repsRef = useRef(0);
  const startedAtRef = useRef(Date.now());
  const submittingRef = useRef(false);

  // Active monster data
  const currentMonster = PUSH_UP_MONSTERS[currentLevel];

  // Request permission on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const triggerDamageAnimation = () => {
    // 1. Shake monster card
    Animated.sequence([
      Animated.timing(monsterShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(monsterShake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(monsterShake, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(monsterShake, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(monsterShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    // 2. Slash neon line across the screen (using scaleX for native driver compatibility)
    slashAnim.setValue(0);
    Animated.timing(slashAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // 3. Floating damage number
    dmgFloat.setValue(0);
    Animated.timing(dmgFloat, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const submitResult = async (reps: number, result: 'completed' | 'retired') => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setOutcome(result);
    setIsVictory(true);
    setGainingXp(true);
    setErrorMessage(null);
    try {
      const durationSeconds = Math.max(3, Math.ceil((Date.now() - startedAtRef.current) / 1000));
      const response = await rankingUpApiClient.rewardMinigameXp(reps, durationSeconds, result);
      setEarnedXp(response.gainedXp);
      setTotalXp(response.totalXp);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al registrar XP');
    } finally {
      setGainingXp(false);
    }
  };

  const retire = () => {
    setConfirmRetirement(false);
    if (repsRef.current === 0) {
      navigation.goBack();
      return;
    }
    void submitResult(repsRef.current, 'retired');
  };

  const handlePushUp = async () => {
    if (isVictory || gainingXp || submittingRef.current || repsRef.current >= PUSH_UP_VICTORY_TARGET) return;

    // Vibrate to confirm rep
    Vibration.vibrate(80);

    const nextReps = repsRef.current + 1;
    repsRef.current = nextReps;
    setPlayerReps(nextReps);

    const nextHp = Math.max(0, monsterHp - 1);
    setMonsterHp(nextHp);

    triggerDamageAnimation();

    // Check if monster defeated
    if (nextHp === 0) {
      if (currentLevel < PUSH_UP_MONSTERS.length - 1) {
        // Next Level / Next Monster
        setGainingXp(true);
        Animated.timing(levelUpAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            setCurrentLevel(currentLevel + 1);
            setMonsterHp(PUSH_UP_MONSTERS[currentLevel + 1].maxHp);
            setGainingXp(false);
            levelUpAnim.setValue(0);
          }, 1200);
        });
      } else {
        // Defeated the final Dragon -> Victory!
        void submitResult(PUSH_UP_VICTORY_TARGET, 'completed');
      }
    }
  };

  const onWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pushup') {
        handlePushUp();
      } else if (data.type === 'state') {
        setDetectorState(data.value);
      } else if (data.type === 'error') {
        console.warn('WebView Camera Error:', data.message);
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CCFF00" />
        <Text style={styles.loadingText}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-reverse" size={64} color="#666" />
        <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
        <Text style={styles.permissionDesc}>
          Este minijuego utiliza tu cámara frontal para detectar tus flexiones automáticamente. No guardamos ni transmitimos ningún video.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>CONCEDER ACCESO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Volver a Minijuegos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Floating Damage interpolations
  const dmgTranslateY = dmgFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const dmgOpacity = dmgFloat.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Level Up interpolations
  const levelUpScale = levelUpAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.5, 1.1, 1],
  });

  const levelUpOpacity = levelUpAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });

  // Cargamos el minijuego directamente por HTTPS desde GitHub Pages. Esto es estrictamente necesario porque los celulares
  // bloquean el acceso a la cámara (getUserMedia) en conexiones inseguras (como HTTP local con la IP de tu PC).

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PUSH UPS VS MONSTERS</Text>
        <View style={styles.repCounter}>
          <Ionicons name="fitness" size={16} color="#CCFF00" />
          <Text style={styles.repCountText}>{playerReps}/{PUSH_UP_VICTORY_TARGET}</Text>
        </View>
      </View>
      {!isVictory ? (
        <View style={styles.projectedReward}>
          <Ionicons name="sparkles-outline" size={14} color="#CCFF00" />
          <Text style={styles.projectedRewardText}>+{estimateXp(playerReps)} XP estimados</Text>
        </View>
      ) : null}

      <View style={styles.campaignProgress}>
        <View style={styles.campaignProgressHeader}>
          <Text style={styles.campaignProgressLabel}>PROGRESO DE CAMPAÑA</Text>
          <Text style={styles.campaignProgressValue}>{Math.max(0, PUSH_UP_VICTORY_TARGET - playerReps)} RESTANTES</Text>
        </View>
        <View style={styles.campaignTrack}>
          <View style={[styles.campaignFill, { width: `${Math.min(100, playerReps)}%` }]} />
        </View>
      </View>

      {/* Main Play Area */}
      {!isVictory ? (
        <View style={styles.playArea}>
          
          {/* WebView Camera Viewport (Large full width screen) */}
          <View style={styles.cameraFrame}>
            <WebView
                source={{ uri: MINIGAME_URL }}
                style={styles.camera}
                originWhitelist={[`${MINIGAME_ORIGIN}/*`]}
                onShouldStartLoadWithRequest={(request) => request.url.startsWith(MINIGAME_ORIGIN)}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                onMessage={onWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onPermissionRequest={(event: any) => {
                  const requested: string[] = event.nativeEvent?.resources ?? [];
                  const allowed = requested.filter((resource) => ALLOWED_WEBVIEW_PERMISSIONS.includes(resource));
                  if (allowed.length > 0) {
                    event.grant(allowed);
                  } else {
                    event.deny();
                  }
                }}
              />
            {/* Status floating badge */}
            <View style={[styles.detectorStatus, { borderColor: detectorState === 'DOWN' ? '#CCFF00' : '#FF007F' }]}>
              <Text style={[styles.detectorStatusText, { color: detectorState === 'DOWN' ? '#CCFF00' : '#FF007F' }]}>
                ESTADO: {detectorState === 'DOWN' ? '¡ABAJO!' : '¡ARRIBA!'}
              </Text>
            </View>
          </View>

          {/* Monster Card */}
          <Animated.View
            style={[
              styles.monsterCard,
              { transform: [{ translateX: monsterShake }] },
            ]}
          >
            <View style={styles.levelIndicator}>
              <Text style={styles.levelText}>NIVEL {currentMonster.level} / {PUSH_UP_MONSTERS.length}</Text>
            </View>

            <View style={styles.monsterProfile}>
              <View style={[styles.monsterIcon, { borderColor: currentMonster.color }]}>
                <Ionicons name={currentMonster.icon} size={38} color={currentMonster.color} />
              </View>
              <View style={styles.monsterDetail}>
                <Text style={styles.monsterName}>{currentMonster.name}</Text>
                <Text style={styles.monsterHpVal}>
                  {monsterHp} / {currentMonster.maxHp} HP
                </Text>
              </View>
            </View>

            {/* HP Bar */}
            <View style={styles.hpBarContainer}>
              <View style={styles.hpProgressBg}>
                <View
                  style={[
                    styles.hpProgressFill,
                    {
                      width: `${(monsterHp / currentMonster.maxHp) * 100}%`,
                      backgroundColor: currentMonster.color,
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>

          {/* Floating Damage Text */}
          <Animated.View
            style={[
              styles.dmgTextContainer,
              {
                opacity: dmgOpacity,
                transform: [{ translateY: dmgTranslateY }],
              },
            ]}
          >
            <Text style={styles.dmgText}>¡ATAQUE! -1 HP</Text>
          </Animated.View>

          {/* Slash animation effect using native-driver scaleX scale */}
          <Animated.View
            style={[
              styles.slashEffect,
              {
                width: width - 40,
                opacity: slashAnim.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    rotate: slashAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['15deg', '-15deg'],
                    }),
                  },
                  {
                    scaleX: slashAnim,
                  },
                ],
              },
            ]}
          />

          {/* Bottom Control Bar */}
          <View style={styles.controlBar}>
            <Text style={styles.instructionText}>
              Apoya tu celular frente a ti. Haz flexiones completas subiendo y bajando en el encuadre de la cámara.
            </Text>
            <Pressable style={styles.retireButton} onPress={() => setConfirmRetirement(true)} accessibilityRole="button">
              <Text style={styles.retireButtonText}>RETIRARME</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* Victory Screen */
        <View style={styles.victoryContainer}>
          <View style={styles.victoryIcon}>
            <Ionicons name="trophy" size={54} color="#CCFF00" />
          </View>
          <Text style={styles.victoryTitle}>{outcome === 'retired' ? 'TE RETIRASTE' : '¡VICTORIA TOTAL!'}</Text>
          <Text style={styles.victorySubtitle}>
            {outcome === 'retired'
              ? `Derrotaste a ${currentLevel} de ${PUSH_UP_MONSTERS.length} monstruos con ${playerReps} flexiones.`
              : `Completaste los seis niveles con ${playerReps} flexiones y derrotaste al jefe final.`}
          </Text>

          <View style={styles.rewardCard}>
            <Text style={styles.rewardCardTitle}>RECOMPENSA DE ENTRENAMIENTO</Text>
            
            {gainingXp ? (
              <ActivityIndicator size="small" color="#CCFF00" style={{ marginVertical: 10 }} />
            ) : errorMessage ? (
              <Text style={styles.errorText}>Error al guardar: {errorMessage}</Text>
            ) : (
              <View style={styles.rewardBox}>
                <View style={styles.rewardRowValue}>
                  <Ionicons name="sparkles" size={24} color="#CCFF00" />
                  <Text style={styles.rewardValue}>+{earnedXp ?? 0} XP</Text>
                </View>
                {totalXp !== null ? (
                  <Text style={styles.totalXpText}>XP Total: {totalXp} puntos</Text>
                ) : null}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.finishBtn} onPress={() => navigation.navigate('Minigames')}>
            <Text style={styles.finishBtnText}>VOLVER A MINIJUEGOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Level Up Notification Modal Overlay */}
      {gainingXp && !isVictory && (
        <Animated.View
          style={[
            styles.levelUpOverlay,
            {
              opacity: levelUpOpacity,
              transform: [{ scale: levelUpScale }],
            },
          ]}
        >
          <View style={styles.levelUpIcon}>
            <Ionicons name="flash" size={30} color="#FF2D55" />
          </View>
          <Text style={styles.levelUpTitle}>¡MONSTRUO ELIMINADO!</Text>
          <Text style={styles.levelUpSubtitle}>
            Cargando el siguiente nivel... prepárate.
          </Text>
        </Animated.View>
      )}
      <Modal visible={confirmRetirement} transparent animationType="fade" onRequestClose={() => setConfirmRetirement(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>¿Retirarte ahora?</Text>
            <Text style={styles.confirmText}>
              Llevas {playerReps} flexiones y has derrotado a {currentLevel} de {PUSH_UP_MONSTERS.length} monstruos.
            </Text>
            <Text style={styles.confirmReward}>
              Recibirás aproximadamente {estimateXp(playerReps)} XP. Si llegas a 100, recibirás 50 XP.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.keepGoingButton} onPress={() => setConfirmRetirement(false)} accessibilityRole="button">
                <Text style={styles.keepGoingText}>SEGUIR</Text>
              </Pressable>
              <Pressable style={styles.confirmRetireButton} onPress={retire} accessibilityRole="button">
                <Text style={styles.confirmRetireText}>RETIRARME</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F14',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0F0F14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 20,
    letterSpacing: 0.5,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 20,
  },
  permissionBtn: {
    backgroundColor: '#CCFF00',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  backLink: {
    padding: 10,
  },
  backLinkText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#1C1C24',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  repCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204,255,0,0.1)',
    borderWidth: 1,
    borderColor: '#CCFF00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  repCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#CCFF00',
    marginLeft: 4,
  },
  projectedReward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: '#111118' },
  projectedRewardText: { color: '#CCFF00', fontSize: 11, fontWeight: '800' },
  campaignProgress: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#111118', borderBottomWidth: 1, borderBottomColor: '#242432' },
  campaignProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  campaignProgressLabel: { color: '#8E8E9F', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  campaignProgressValue: { color: '#CCFF00', fontSize: 9, fontWeight: '900' },
  campaignTrack: { height: 5, backgroundColor: '#252532', borderRadius: 3, overflow: 'hidden' },
  campaignFill: { height: '100%', backgroundColor: '#CCFF00', borderRadius: 3 },
  playArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  cameraFrame: {
    width: '100%',
    height: height * 0.45,
    backgroundColor: '#000',
    borderBottomWidth: 2,
    borderColor: '#CCFF00',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  detectorStatus: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    backgroundColor: 'rgba(15,15,25,0.85)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  detectorStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  monsterCard: {
    width: width - 40,
    backgroundColor: '#15151F',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232333',
    marginTop: 10,
  },
  levelIndicator: {
    backgroundColor: '#20202F',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#A0A0B3',
    letterSpacing: 1,
  },
  monsterProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monsterIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    backgroundColor: '#101018',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  monsterDetail: {
    flex: 1,
  },
  monsterName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  monsterHpVal: {
    fontSize: 12,
    color: '#8E8E9F',
    fontWeight: '700',
    marginTop: 2,
  },
  hpBarContainer: {
    width: '100%',
  },
  hpProgressBg: {
    height: 8,
    backgroundColor: '#0F0F14',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hpProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dmgTextContainer: {
    position: 'absolute',
    top: height * 0.45 + 50,
    zIndex: 10,
  },
  dmgText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF2D55',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  slashEffect: {
    position: 'absolute',
    top: height * 0.45 + 60,
    height: 4,
    backgroundColor: '#FF2D55',
    borderRadius: 2,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    zIndex: 9,
  },
  controlBar: {
    width: width - 40,
    alignItems: 'center',
  },
  retireButton: { minWidth: 160, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#FF496C', alignItems: 'center', justifyContent: 'center' },
  retireButtonText: { color: '#FF8FA6', fontSize: 12, fontWeight: '900' },
  instructionText: {
    fontSize: 11,
    color: '#6E6E80',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  victoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  victoryIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#CCFF00',
    backgroundColor: 'rgba(204,255,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  victoryTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#CCFF00',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  victorySubtitle: {
    fontSize: 14,
    color: '#8E8E9F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  rewardCard: {
    width: '100%',
    backgroundColor: '#15151F',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232333',
    alignItems: 'center',
    marginBottom: 30,
  },
  rewardCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6E6E80',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  rewardBox: {
    alignItems: 'center',
  },
  rewardRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#CCFF00',
    marginLeft: 8,
  },
  totalXpText: {
    fontSize: 11,
    color: '#8E8E9F',
    marginTop: 6,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF2D55',
    fontWeight: '600',
    fontSize: 12,
  },
  finishBtn: {
    backgroundColor: '#CCFF00',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
  },
  levelUpOverlay: {
    position: 'absolute',
    top: height / 2 - 120,
    left: 40,
    right: 40,
    backgroundColor: '#1E1E30',
    borderWidth: 2,
    borderColor: '#FF2D55',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 100,
  },
  levelUpIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,45,85,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  levelUpTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  levelUpSubtitle: {
    fontSize: 12,
    color: '#8E8E9F',
    textAlign: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmCard: { width: '100%', maxWidth: 400, backgroundColor: '#191B20', borderWidth: 1, borderColor: '#353940', borderRadius: 8, padding: 20 },
  confirmTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  confirmText: { color: '#D4D8DE', fontSize: 14, lineHeight: 20 },
  confirmReward: { color: '#CCFF00', fontSize: 13, lineHeight: 19, marginTop: 12 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  keepGoingButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#606871' },
  keepGoingText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  confirmRetireButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FF496C' },
  confirmRetireText: { color: '#101114', fontSize: 12, fontWeight: '900' },
});
