import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, Duel, OpenDuelsResponse, ProfileSearchResult } from '../types';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { getErrorMessage } from '../utils/errors';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const POLL_INTERVAL_MS = 6000;
const SEARCH_DEBOUNCE_MS = 400;
const TARGET_OPTIONS = [15, 30, 50];

const EMPTY_DUELS: OpenDuelsResponse = { incoming: [], outgoing: [], active: [] };

export default function DuelLobbyScreen() {
  const navigation = useNavigation<Navigation>();

  const [duels, setDuels] = useState<OpenDuelsResponse>(EMPTY_DUELS);
  const [record, setRecord] = useState({ wins: 0, losses: 0, draws: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyDuelId, setBusyDuelId] = useState<string | null>(null);

  const [targetReps, setTargetReps] = useState(TARGET_OPTIONS[1]);
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadDuels = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const [open, history] = await Promise.all([
        rankingUpApiClient.getOpenDuels(),
        rankingUpApiClient.getDuelHistory(),
      ]);
      if (!isMounted.current) return;
      setDuels(open);
      setRecord(history.record);
    } catch (error: unknown) {
      if (!isMounted.current) return;
      if (showSpinner) Alert.alert('Error', getErrorMessage(error, 'No se pudieron cargar los duelos.'));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Sondeo mientras la pantalla esta visible: es como llega un reto entrante.
  useFocusEffect(
    useCallback(() => {
      void loadDuels(true);
      const timer = setInterval(() => void loadDuels(false), POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [loadDuels])
  );

  useEffect(() => {
    const term = searchInput.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await rankingUpApiClient.searchProfiles(term);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchInput]);

  const runDuelAction = async (duelId: string, action: () => Promise<Duel>, onSuccess?: (duel: Duel) => void) => {
    setBusyDuelId(duelId);
    try {
      const duel = await action();
      await loadDuels(false);
      onSuccess?.(duel);
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo completar la acción.'));
      await loadDuels(false);
    } finally {
      if (isMounted.current) setBusyDuelId(null);
    }
  };

  const handleChallenge = async (profile: ProfileSearchResult) => {
    setChallengingId(profile.id);
    try {
      await rankingUpApiClient.challengeToDuel(profile.id, targetReps);
      setSearchInput('');
      setResults([]);
      await loadDuels(false);
      Alert.alert('Reto enviado', `${profile.name} tiene 10 minutos para aceptar.`);
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo enviar el reto.'));
    } finally {
      if (isMounted.current) setChallengingId(null);
    }
  };

  const renderDuelCard = (duel: Duel, actions: React.ReactNode) => (
    <View key={duel.id} style={styles.duelCard}>
      <View style={styles.duelInfo}>
        <Text style={styles.duelRival}>{duel.rival.name}</Text>
        <Text style={styles.duelMeta}>
          {duel.rival.username ? `@${duel.rival.username} • ` : ''}
          {duel.targetReps} flexiones
        </Text>
      </View>
      {busyDuelId === duel.id ? <ActivityIndicator color="#CCFF00" /> : <View style={styles.duelActions}>{actions}</View>}
    </View>
  );

  const pill = (label: string, color: string, onPress: () => void) => (
    <TouchableOpacity style={[styles.pill, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ VOLVER</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#CCFF00"
            onRefresh={async () => {
              setRefreshing(true);
              await loadDuels(false);
              if (isMounted.current) setRefreshing(false);
            }}
          />
        }
      >
        <Text style={styles.mainTitle}>DUELO 1v1</Text>
        <Text style={styles.lead}>Reta a otro atleta. El primero en llegar al objetivo gana.</Text>

        <View style={styles.recordRow}>
          <View style={styles.recordBox}>
            <Text style={[styles.recordValue, { color: '#CCFF00' }]}>{record.wins}</Text>
            <Text style={styles.recordLabel}>VICTORIAS</Text>
          </View>
          <View style={styles.recordBox}>
            <Text style={[styles.recordValue, { color: '#FF007F' }]}>{record.losses}</Text>
            <Text style={styles.recordLabel}>DERROTAS</Text>
          </View>
          <View style={styles.recordBox}>
            <Text style={[styles.recordValue, { color: '#A0A0A0' }]}>{record.draws}</Text>
            <Text style={styles.recordLabel}>EMPATES</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#CCFF00" size="large" style={styles.loader} />
        ) : (
          <>
            {duels.active.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EN CURSO</Text>
                {duels.active.map((duel) =>
                  renderDuelCard(
                    duel,
                    pill('ENTRAR', '#CCFF00', () => navigation.navigate('Duel', { duelId: duel.id }))
                  )
                )}
              </View>
            )}

            {duels.incoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TE HAN RETADO</Text>
                {duels.incoming.map((duel) =>
                  renderDuelCard(
                    duel,
                    <>
                      {pill('ACEPTAR', '#CCFF00', () =>
                        runDuelAction(
                          duel.id,
                          () => rankingUpApiClient.acceptDuel(duel.id),
                          () => navigation.navigate('Duel', { duelId: duel.id })
                        )
                      )}
                      {pill('RECHAZAR', '#FF007F', () =>
                        runDuelAction(duel.id, () => rankingUpApiClient.declineDuel(duel.id))
                      )}
                    </>
                  )
                )}
              </View>
            )}

            {duels.outgoing.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ESPERANDO RESPUESTA</Text>
                {duels.outgoing.map((duel) =>
                  renderDuelCard(
                    duel,
                    pill('CANCELAR', '#FF007F', () =>
                      runDuelAction(duel.id, () => rankingUpApiClient.cancelDuel(duel.id))
                    )
                  )
                )}
              </View>
            )}
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OBJETIVO DEL DUELO</Text>
          <View style={styles.targetRow}>
            {TARGET_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.targetChip, targetReps === option && styles.targetChipActive]}
                onPress={() => setTargetReps(option)}
              >
                <Text style={[styles.targetText, targetReps === option && styles.targetTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUSCAR RIVAL</Text>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre o @usuario"
              placeholderTextColor="#666"
              value={searchInput}
              onChangeText={setSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator color="#CCFF00" size="small" />}
          </View>

          {results.map((profile) => (
            <View key={profile.id} style={styles.duelCard}>
              <View style={styles.duelInfo}>
                <Text style={styles.duelRival}>{profile.name}</Text>
                <Text style={styles.duelMeta}>@{profile.username} • {profile.xp} XP</Text>
              </View>
              {challengingId === profile.id ? (
                <ActivityIndicator color="#CCFF00" />
              ) : (
                pill('RETAR', '#CCFF00', () => handleChallenge(profile))
              )}
            </View>
          ))}

          {searchInput.trim().length >= 2 && !searching && results.length === 0 && (
            <Text style={styles.emptyText}>Sin perfiles públicos para esa búsqueda.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  backButton: { paddingVertical: 8 },
  backButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lead: { color: '#A0A0A0', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  recordRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  recordBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    alignItems: 'center',
  },
  recordValue: { fontSize: 26, fontWeight: '900' },
  recordLabel: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  loader: { marginVertical: 30 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  duelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    padding: 14,
    marginBottom: 10,
  },
  duelInfo: { flex: 1 },
  duelRival: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textTransform: 'uppercase' },
  duelMeta: { color: '#A0A0A0', fontSize: 12, marginTop: 3 },
  duelActions: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  targetRow: { flexDirection: 'row', gap: 10 },
  targetChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  targetChipActive: { borderColor: '#CCFF00', backgroundColor: '#CCFF00' },
  targetText: { color: '#A0A0A0', fontSize: 18, fontWeight: '900' },
  targetTextActive: { color: '#121212' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  emptyText: { color: '#666', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});
