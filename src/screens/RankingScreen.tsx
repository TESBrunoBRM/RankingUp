import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { workoutLogService } from '../services/workoutLogService';
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
             <View style={{flex: 1}}>
               {currentRank.name.toUpperCase().includes('HIERRO') ? (
                 <View style={{ alignItems: 'center', marginBottom: 20 }}>
                   <Image source={require('../../assets/images/hierro.png')} style={{ width: 140, height: 140 }} resizeMode="contain" />
                 </View>
               ) : currentRank.name.toUpperCase().includes('BRONCE') ? (
                 <View style={{ alignItems: 'center', marginBottom: 20 }}>
                   <Image source={require('../../assets/images/bronce.png')} style={{ width: 140, height: 140 }} resizeMode="contain" />
                 </View>
               ) : (
                 <View style={styles.rankBadge}>
                   <Text style={[styles.rankBadgeText, { color: rankColor }]}>❖ {currentRank.name.toUpperCase()}</Text>
                 </View>   
               )}
               <View style={{alignItems: 'center'}}>
                 <Text style={styles.xpLabel}>EXPERIENCIA TOTAL</Text>
                 <Text style={styles.xpValue}>{xp.toLocaleString()} <Text style={styles.xpUnit}>XP</Text></Text>
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
});
