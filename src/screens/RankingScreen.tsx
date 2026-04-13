import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Body from 'react-native-body-highlighter';
import { useAuthStore } from '../store/authStore';
import { workoutLogService } from '../services/workoutLogService';
import { exerciseApi } from '../services/exerciseApi';
import { RankInfo, Profile } from '../types';

const getRankColor = (name: string) => {
  const n = name.toUpperCase();
  if (n.includes('HIERRO')) return '#A0A0A0';
  if (n.includes('BRONCE')) return '#CD7F32';
  if (n.includes('PLATA')) return '#E5E4E2';
  if (n.includes('ORO')) return '#FFD700';
  if (n.includes('PLATINO')) return '#E5E4E2';
  if (n.includes('DIAMANTE')) return '#B9F2FF';
  return '#CCFF00';
};

export default function RankingScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xp, setXp] = useState<number>(0);
  const [ranks, setRanks] = useState<RankInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Body Highlighter State
  const [isFront, setIsFront] = useState(true);
  const [muscleData, setMuscleData] = useState<any[]>([]);

  // Calculate generic base XP just like workoutLogService (fallback)
  const XP_RULES: { [key: string]: number } = {
    'pecho': 15, 'pecho superior': 15, 'espalda (dorsales)': 15, 'espalda media': 15,
    'cuádriceps': 15, 'isquiosurales': 15, 'glúteos': 15,
    'bíceps': 10, 'tríceps': 10, 'hombros': 10, 'pantorrillas': 10, 'abdominales': 10,
    'chest': 15, 'lats': 15, 'middle back': 15, 'lower back': 15,
    'quadriceps': 15, 'hamstrings': 15, 'glutes': 15,
    'biceps': 10, 'triceps': 10, 'shoulders': 10, 'traps': 10, 'calves': 10, 'abdominals': 10,
    'default': 5
  };

  const mapMuscleToSlug = (muscle: string): string => {
    const m = muscle.toLowerCase();
    if (m.includes('pecho') || m === 'chest') return 'chest';
    if (m.includes('hombro') || m === 'shoulders') return 'shoulders';
    if (m.includes('bíc') || m === 'biceps') return 'biceps';
    if (m.includes('tríc') || m === 'triceps') return 'triceps';
    if (m.includes('espalda (dor') || m === 'lats') return 'lats';
    if (m.includes('espalda m') || m === 'middle back') return 'mid-back';
    if (m.includes('espalda b') || m === 'lower back') return 'lower-back';
    if (m.includes('cuádriceps') || m === 'quadriceps') return 'quadriceps';
    if (m.includes('isquio') || m === 'hamstrings') return 'hamstring';
    if (m.includes('glúteo') || m === 'glutes') return 'gluteal';
    if (m.includes('pantorrilla') || m === 'calves') return 'calves';
    if (m.includes('abdomen') || m === 'abdominals') return 'abs';
    if (m.includes('trape') || m === 'traps') return 'trapezius';
    return ''; // empty means ignore/unknown
  };

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [floatAnim]);

  useEffect(() => {
    const fetchProfileAndRanks = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [pData, dbRanks, lbs] = await Promise.all([
           workoutLogService.getUserProfile(user.id),
           workoutLogService.getAllRanks(),
           workoutLogService.getGlobalLeaderboard()
        ]);
        
        if (pData) {
          setProfile(pData);
          setXp(pData.xp || 0);
        }
        if (dbRanks && dbRanks.length > 0) setRanks(dbRanks);
        if (lbs) setLeaderboard(lbs);

        // Calculate Anatomical Muscle XP
        const history = await workoutLogService.getUserExerciseHistory(user.id);
        const uniqueNames = [...new Set(history.map((l: any) => l.exercise_id))];
        const muscleCache: {[name: string]: string} = {};
        
        await Promise.all(uniqueNames.map(async (name: any) => {
           const ex = await exerciseApi.getExerciseByName(name);
           if (ex) muscleCache[name] = ex.muscle;
        }));

        const muscleXpMap: {[slug: string]: number} = {};
        history.forEach((log: any) => {
           const muscle = muscleCache[log.exercise_id];
           if (muscle) {
              const baseXP = XP_RULES[muscle.toLowerCase()] || XP_RULES['default'];
              const slug = mapMuscleToSlug(muscle);
              if (slug) {
                muscleXpMap[slug] = (muscleXpMap[slug] || 0) + baseXP;
              }
           }
        });

        // Translate XP Map into BodyData mapped to Rank Colors
        // Note: For body visualization, we might want lower rank scaling so it populates faster,
        // or just use the global ranks min_xp / max_xp exactly. Let's use exact ranks.
        const bodyData = Object.keys(muscleXpMap).map(slug => {
           const bodyXp = muscleXpMap[slug];
           const rnk = dbRanks.find(r => 
               bodyXp >= r.min_xp && (r.max_xp === null || bodyXp <= r.max_xp)
           ) || dbRanks[0];

           return {
              slug: slug,
              intensity: 1, // Doesn't matter because color overrides
              color: getRankColor(rnk.name)
           };
        });
        setMuscleData(bodyData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndRanks();
  }, [user]);

  const currentRank = ranks.find(r => 
     xp >= r.min_xp && (r.max_xp === null || xp <= r.max_xp)
  ) || ranks[0] || { id: 0, name: 'Unranked', min_xp: 0, max_xp: null };

  const rankColor = getRankColor(currentRank.name);
  
  const progressMin = currentRank.min_xp;
  const progressMax = currentRank.max_xp !== null ? currentRank.max_xp : progressMin + 1;
  const isMaxLevel = currentRank.max_xp === null;
  const range = isMaxLevel ? 1 : progressMax - progressMin;
  const currentProgress = xp - progressMin;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, (currentProgress / range) * 100));

  const getIMC = () => {
    if (!profile || !profile.weight || !profile.height) return { value: 0, text: 'N/A', color: '#666' };
    const m = profile.height / 100;
    const imc = profile.weight / (m * m);
    let text = '';
    let color = '';
    
    if (imc < 18.5) { text = 'BAJO PESO'; color = '#FFD700'; }
    else if (imc < 24.9) { text = 'SALUDABLE'; color = '#CCFF00'; }
    else if (imc < 29.9) { text = 'SOBREPESO'; color = '#FF8C00'; }
    else { text = 'OBESIDAD'; color = '#FF3B30'; }
    
    return { value: imc.toFixed(1), text, color };
  };

  const imcData = getIMC();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ VOLVER</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.mainTitle}>RANGO Y NIVEL</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
           
           <View style={styles.topSection}>
              <View style={{flex: 1, alignItems: 'center'}}>
                
                <View style={styles.segmentControl}>
                   <TouchableOpacity style={[styles.segmentBtn, isFront && styles.segmentBtnActive]} onPress={() => setIsFront(true)}>
                     <Text style={[styles.segmentText, isFront && styles.segmentTextActive]}>FRENTE</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={[styles.segmentBtn, !isFront && styles.segmentBtnActive]} onPress={() => setIsFront(false)}>
                     <Text style={[styles.segmentText, !isFront && styles.segmentTextActive]}>ESPALDA</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.rotateBtnIcon} onPress={() => setIsFront(!isFront)}>
                     <Text style={{color: '#CCFF00', fontSize: 16}}>↻</Text>
                   </TouchableOpacity>
                </View>

                {/* LEGEND ROW */}
                <View style={styles.legendContainer}>
                  {ranks.slice(0).reverse().map((r) => (
                    <View key={r.id} style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={{width: 14, height: 14, borderRadius: 7, backgroundColor: getRankColor(r.name), marginRight: 6}} />
                      <Text style={{color: '#A0A0A0', fontSize: 11, fontWeight: '800'}}>{r.name}</Text>
                    </View>
                  ))}
                </View>

                <View style={{height: 460, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 10}}>
                  <Body 
                    data={muscleData}
                    scale={1.1}
                    frontOnly={false}
                    backOnly={false}
                    side={isFront ? 'front' : 'back'}
                  />
                  {/* Floating Total Rank Badge Overlaid on Bottom Right */}
                  <Animated.View style={[styles.rankOverlayBadge, { transform: [{ translateY: floatAnim }] }]}>
                    {currentRank.name.toUpperCase().includes('HIERRO') ? (
                       <Image source={require('../../assets/images/hierro.png')} style={{ width: 60, height: 60, marginBottom: 4 }} resizeMode="contain" />
                    ) : currentRank.name.toUpperCase().includes('BRONCE') ? (
                       <Image source={require('../../assets/images/bronce.png')} style={{ width: 60, height: 60, marginBottom: 4 }} resizeMode="contain" />
                    ) : (
                       <Text style={[styles.rankBadgeText, { color: rankColor, fontSize: 12, marginBottom: 4 }]}>❖ {currentRank.name.toUpperCase()}</Text>
                    )}
                    <Text style={styles.xpLabel}>TOTAL</Text>
                    <Text style={{fontSize: 14, fontWeight: '900', color: '#FFF'}}>{xp.toLocaleString()} <Text style={{fontSize: 10, color: '#CCFF00'}}>XP</Text></Text>
                  </Animated.View>
                </View>
              </View>
           </View>

           <View style={styles.progressSection}>
             <View style={styles.progressHeader}>
               <Text style={styles.progressLabel}>PROGRESO DE NIVEL</Text>
               <Text style={styles.progressNumbers}>
                 {xp} / {isMaxLevel ? 'MAX' : progressMax} XP
               </Text>
             </View>
             <View style={styles.track}>
                <View style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: rankColor }]} />
             </View>
             <Text style={styles.remainText}>{!isMaxLevel ? `${(progressMax - xp + 1).toLocaleString()} XP para el siguiente nivel`  : '¡Alcanzaste el rango máximo!'}</Text>
           </View>
           
           <View style={styles.metricsRow}>
             <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>PESO ACTUAL</Text>
               <Text style={styles.metricValue}>{profile?.weight || '--'} <Text style={styles.metricUnit}>KG</Text></Text>
             </View>
             <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>I.M.C.</Text>
               <Text style={[styles.metricValue, { color: imcData.color }]}>{imcData.value}</Text>
               <Text style={[styles.metricSub, { color: imcData.color }]}>{imcData.text}</Text>
             </View>
           </View>

           <View style={styles.strengthCard}>
             <Text style={styles.strengthTitle}>🎯 FUERZA RELATIVA (MVP)</Text>
             <Text style={styles.strengthText}>
               Como pesas <Text style={styles.hl}>{profile?.weight || '--'}kg</Text>, levantar <Text style={styles.hl}>{profile?.weight || '--'}kg</Text> en Press de Banca ya te califica como <Text style={{color:'#CCFF00', fontWeight:'bold'}}>PROMEDIO</Text>. Levantar <Text style={styles.hl}>{profile?.weight ? Math.round(profile.weight * 1.5) : '--'}kg</Text> equivale al Rango <Text style={{color:'#B9F2FF', fontWeight:'bold'}}>AVANZADO</Text>. ¡Compite contra tu propio peso corporal!
             </Text>
           </View>
           
           {/* GLOBAL LEADERBOARD */}
           <View style={styles.leaderboardSection}>
             <Text style={styles.leaderboardTitle}>🌍 RANKING GLOBAL</Text>
             <Text style={styles.leaderboardSubtitle}>COMPITE CONTRA OTROS ATLETAS</Text>
             
             <View style={styles.leaderboardList}>
               {leaderboard.map((lb, index) => {
                  const isMe = lb.id === user?.id;
                  return (
                    <View key={lb.id} style={[styles.lbRow, isMe && styles.lbRowMe]}>
                       <Text style={[styles.lbRank, isMe && styles.lbRankMe]}>#{index + 1}</Text>
                       <Text style={[styles.lbName, isMe && styles.lbNameMe]} numberOfLines={1}>
                          {isMe ? 'TÚ' : (lb.name || `Atleta ${lb.id.substring(0,4)}`)}
                       </Text>
                       <Text style={[styles.lbXp, isMe && styles.lbXpMe]}>{lb.xp.toLocaleString()} XP</Text>
                    </View>
                  );
               })}
             </View>
           </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { paddingVertical: 8 },
  backButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', paddingHorizontal: 24, marginBottom: 10, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40 },
  topSection: { flexDirection: 'row', backgroundColor: '#1A1A1A', padding: 24, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: '#333' },
  rankBadge: { alignSelf: 'center', backgroundColor: '#121212', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  rankBadgeText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  xpLabel: { fontSize: 11, color: '#A0A0A0', fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  xpValue: { fontSize: 40, fontWeight: '900', color: '#FFFFFF' },
  xpUnit: { fontSize: 20, color: '#CCFF00' },
  progressSection: { marginBottom: 30 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontSize: 12, color: '#FFFFFF', fontWeight: '800', letterSpacing: 1 },
  progressNumbers: { fontSize: 12, color: '#CCFF00', fontWeight: '800' },
  track: { height: 16, backgroundColor: '#1A1A1A', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  fill: { height: '100%', borderRadius: 8 },
  remainText: { fontSize: 12, color: '#A0A0A0', textAlign: 'center', marginTop: 12, fontWeight: '600' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { width: '48%', backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  metricLabel: { fontSize: 11, color: '#A0A0A0', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  metricUnit: { fontSize: 14, color: '#A0A0A0' },
  metricSub: { fontSize: 11, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  
  strengthCard: { backgroundColor: 'rgba(204, 255, 0, 0.05)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(204, 255, 0, 0.2)', marginBottom: 20 },
  strengthTitle: { fontSize: 14, color: '#CCFF00', fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  strengthText: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, fontWeight: '500' },
  hl: { color: '#FFFFFF', fontWeight: '900' },

  leaderboardSection: { marginTop: 10, padding: 20, backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  leaderboardTitle: { fontSize: 18, color: '#CCFF00', fontWeight: '900', letterSpacing: 1 },
  leaderboardSubtitle: { fontSize: 10, color: '#A0A0A0', fontWeight: '800', marginBottom: 16, letterSpacing: 1 },
  leaderboardList: { gap: 8 },
  lbRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  lbRowMe: { borderColor: '#CCFF00', backgroundColor: 'rgba(204,255,0,0.05)' },
  lbRank: { width: 40, fontSize: 14, color: '#A0A0A0', fontWeight: '900' },
  lbRankMe: { color: '#CCFF00' },
  lbName: { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  lbNameMe: { color: '#CCFF00', fontWeight: '900' },
  lbXp: { fontSize: 14, color: '#CCFF00', fontWeight: '900' },
  lbXpMe: { color: '#FFFFFF' },
  
  segmentControl: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 24, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20 },
  segmentBtnActive: { backgroundColor: '#CCFF00' },
  segmentText: { color: '#888', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  segmentTextActive: { color: '#000' },
  rotateBtnIcon: { paddingVertical: 8, paddingHorizontal: 12, marginLeft: 5, borderLeftWidth: 1, borderLeftColor: '#333' },
  
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 10, paddingHorizontal: 20 },
  rankOverlayBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(20,20,20,0.95)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#333', alignItems: 'center', zIndex: 10 }
});
