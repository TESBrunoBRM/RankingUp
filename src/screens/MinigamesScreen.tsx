import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types';
import { PUSH_UP_MONSTERS, PUSH_UP_VICTORY_TARGET } from '../constants/pushUpGame';

export default function MinigamesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MINIJUEGOS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Desafía tus límites, entrena jugando y gana XP para subir de rango global.</Text>

        {/* Game Card 1: Push Ups vs Monsters */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PushUpsGame')}
        >
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Ionicons name="flame" size={14} color="#000" />
              <Text style={styles.badgeText}>POPULAR</Text>
            </View>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>MEDIO</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.gameTitle}>Push Ups vs Monsters</Text>
            <Text style={styles.gameDesc}>
              Supera seis niveles con la cámara frontal. Cada flexión es un ataque y la campaña completa termina exactamente en {PUSH_UP_VICTORY_TARGET} repeticiones.
            </Text>

            <View style={styles.monsterRow}>
              {PUSH_UP_MONSTERS.map((monster) => (
                <View key={monster.level} style={styles.monsterIconContainer}>
                  <View style={[styles.monsterIconBadge, { borderColor: monster.color }]}>
                    <Ionicons name={monster.icon} size={20} color={monster.color} />
                  </View>
                  <Text style={styles.monsterMiniLabel} numberOfLines={1}>{monster.shortName}</Text>
                  <Text style={styles.monsterHpLabel}>{monster.maxHp} HP</Text>
                </View>
              ))}
            </View>

            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="add-circle" size={16} color="#CCFF00" />
                <Text style={styles.rewardText}>+50 XP por victoria</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="camera" size={16} color="#CCFF00" />
                <Text style={styles.rewardText}>Cámara frontal activa</Text>
              </View>
            </View>

            <View style={styles.playButton}>
              <Text style={styles.playButtonText}>¡JUGAR AHORA!</Text>
              <Ionicons name="play-forward" size={18} color="#000" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Game Card 2: 1v1 duel */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('DuelLobby')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: '#FF007F' }]}>
              <Ionicons name="flash" size={14} color="#FFF" />
              <Text style={[styles.badgeText, { color: '#FFF' }]}>NUEVO</Text>
            </View>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>1v1</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.gameTitle}>Duelo de Flexiones</Text>
            <Text style={styles.gameDesc}>
              Reta a otro atleta de RankingUp. Los dos hacéis flexiones a la vez y veis el
              marcador del rival en tiempo real. Gana quien llegue antes al objetivo.
            </Text>

            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="add-circle" size={16} color="#CCFF00" />
                <Text style={styles.rewardText}>+75 XP al ganador</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="people" size={16} color="#CCFF00" />
                <Text style={styles.rewardText}>Marcador en vivo</Text>
              </View>
            </View>

            <View style={styles.playButton}>
              <Text style={styles.playButtonText}>BUSCAR RIVAL</Text>
              <Ionicons name="flash" size={18} color="#000" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Coming Soon Card */}
        <View style={[styles.card, styles.disabledCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: '#333' }]}>
              <Text style={[styles.badgeText, { color: '#888' }]}>PRÓXIMAMENTE</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.gameTitle, { color: '#666' }]}>Squat Jump Survivor</Text>
            <Text style={[styles.gameDesc, { color: '#555' }]}>
              Esquiva los obstáculos saltando. Tu cámara detectará tus sentadillas y saltos para mantenerte a salvo del fuego.
            </Text>
            <View style={styles.playButtonDisabled}>
              <Text style={styles.playButtonDisabledText}>BLOQUEADO</Text>
              <Ionicons name="lock-closed" size={16} color="#555" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101114',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#1A1A1A',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#CCFF00',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  disabledCard: {
    borderColor: '#222',
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFF00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFB800',
  },
  cardBody: {
    padding: 20,
    paddingTop: 8,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
  },
  gameDesc: {
    fontSize: 13,
    color: '#AAA',
    lineHeight: 18,
    marginBottom: 16,
  },
  monsterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  monsterIconContainer: {
    alignItems: 'center',
    width: '16%',
  },
  monsterIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: '#191921',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  monsterMiniLabel: {
    width: '100%',
    fontSize: 7,
    color: '#A0A0A0',
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  monsterHpLabel: { fontSize: 7, color: '#666', fontWeight: '800', marginTop: 2 },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCFF00',
    paddingVertical: 14,
    borderRadius: 16,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    marginRight: 6,
    letterSpacing: 1,
  },
  playButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  playButtonDisabledText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#555',
    marginRight: 6,
    letterSpacing: 1,
  },
});
