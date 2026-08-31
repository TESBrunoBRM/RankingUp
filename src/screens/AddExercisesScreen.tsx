import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppStackParamList,
  CatalogExerciseDetail,
  CatalogExerciseSummary,
  CatalogFacet,
  CatalogFiltersResponse,
} from '../types';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { workoutExerciseService } from '../services/workoutExerciseService';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { getErrorDetail, getErrorMessage } from '../utils/errors';

type AddExercisesRouteProp = RouteProp<AppStackParamList, 'AddExercises'>;
type AddExercisesNavigationProp = NativeStackNavigationProp<AppStackParamList, 'AddExercises'>;

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;

type FacetKey = 'bodyPart' | 'equipment' | 'target';

interface ActiveFilters {
  bodyPart?: string;
  equipment?: string;
  target?: string;
}

const FACET_TABS: { key: FacetKey; label: string; source: keyof CatalogFiltersResponse }[] = [
  { key: 'bodyPart', label: 'ZONA', source: 'bodyParts' },
  { key: 'equipment', label: 'EQUIPO', source: 'equipment' },
  { key: 'target', label: 'MÚSCULO', source: 'targets' },
];

export default function AddExercisesScreen() {
  const route = useRoute<AddExercisesRouteProp>();
  const navigation = useNavigation<AddExercisesNavigationProp>();
  const { workoutId } = route.params;

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ActiveFilters>({});
  const [activeTab, setActiveTab] = useState<FacetKey>('bodyPart');

  const [facets, setFacets] = useState<CatalogFiltersResponse | null>(null);
  const [exercises, setExercises] = useState<CatalogExerciseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detail, setDetail] = useState<CatalogExerciseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [adding, setAdding] = useState(false);

  // Cada busqueda lleva un numero de secuencia: si el usuario sigue escribiendo,
  // las respuestas viejas que lleguen tarde se descartan en vez de pisar la lista.
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    rankingUpApiClient
      .getExerciseFilters()
      .then((response) => {
        if (!cancelled) setFacets(response);
      })
      .catch(() => {
        // Los filtros son opcionales: sin ellos la busqueda por texto sigue viva.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      const seq = ++requestSeq.current;
      if (replace) {
        setLoading(true);
        setLoadError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await rankingUpApiClient.searchExercises({
          query: query.length >= 2 ? query : undefined,
          ...filters,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        if (seq !== requestSeq.current) return;

        setExercises((current) => (replace ? response.items : [...current, ...response.items]));
        setTotal(response.total);
        setHasMore(response.hasMore);
        setPage(response.page);
      } catch (error: unknown) {
        if (seq !== requestSeq.current) return;
        setLoadError(getErrorMessage(error, 'No se pudo cargar el catálogo de ejercicios.'));
        if (replace) setExercises([]);
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, filters]
  );

  useEffect(() => {
    void loadPage(1, true);
  }, [loadPage]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    void loadPage(page + 1, false);
  };

  const toggleFilter = (key: FacetKey, value: string) => {
    setFilters((current) => ({ ...current, [key]: current[key] === value ? undefined : value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const currentFacets: CatalogFacet[] = useMemo(() => {
    if (!facets) return [];
    const tab = FACET_TABS.find((item) => item.key === activeTab);
    if (!tab) return [];
    const list = facets[tab.source];
    return Array.isArray(list) ? list : [];
  }, [facets, activeTab]);

  const openDetail = async (exercise: CatalogExerciseSummary) => {
    setDetailLoading(true);
    setSets('3');
    setReps('10');
    try {
      const full = await rankingUpApiClient.getExercise(exercise.id);
      setDetail(full);
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo cargar el ejercicio.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddExercise = async () => {
    if (!detail) return;

    const setsNum = parseInt(sets, 10);
    const repsNum = parseInt(reps, 10);

    if (isNaN(setsNum) || isNaN(repsNum) || setsNum <= 0 || repsNum <= 0) {
      Alert.alert('Inválido', 'Sets y reps deben ser números mayores a 0.');
      return;
    }

    try {
      setAdding(true);
      await workoutExerciseService.addExerciseToWorkout({
        workout_id: workoutId,
        // exercise_id guarda el nombre: es la clave con la que el backend cruza
        // los estandares de fuerza y el historial ya existente.
        exercise_id: detail.name,
        sets: setsNum,
        reps: repsNum,
        order: 0,
      });
      setDetail(null);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo añadir el ejercicio.');
      const details = getErrorDetail(error, 'details');
      const hint = getErrorDetail(error, 'hint');
      Alert.alert(
        'Error al añadir',
        [message, details && `Detalle: ${details}`, hint && `Hint: ${hint}`].filter(Boolean).join('\n\n')
      );
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item }: { item: CatalogExerciseSummary }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.7}>
      <View style={styles.thumbBox}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumb}
            resizeMode="cover"
            accessibilityLabel={`Vista previa de ${item.name}`}
          />
        ) : (
          <Ionicons name="barbell-outline" size={26} color="#666" />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.muscleText}>{item.targetLabel}</Text>
        <Text style={styles.equipmentText}>
          {item.equipmentLabel} • {item.bodyPartLabel}
        </Text>
      </View>
      <View style={styles.addButtonIcon}>
        <Text style={styles.addButtonIconText}>+</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ CANCELAR</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.mainTitle}>BIBLIOTECA</Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar: pecho, mancuernas, squat..."
            placeholderTextColor="#666"
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {facets && (
        <>
          <View style={styles.tabRow}>
            {FACET_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                  {filters[tab.key] ? ' •' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps="handled"
          >
            {currentFacets.map((facet) => {
              const selected = filters[activeTab] === facet.value;
              return (
                <TouchableOpacity
                  key={facet.value}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => toggleFilter(activeTab, facet.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                    {facet.label} {facet.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      <View style={styles.resultsBar}>
        <Text style={styles.subtitle}>
          {loading ? 'BUSCANDO...' : `${total} EJERCICIO${total === 1 ? '' : 'S'}`}
        </Text>
        {(activeFilterCount > 0 || searchInput.length > 0) && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearText}>LIMPIAR</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#CCFF00" style={styles.footerLoader} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{loadError ? 'ERROR DE CONEXIÓN' : 'SIN RESULTADOS'}</Text>
              <Text style={styles.emptySubtext}>
                {loadError ?? 'Prueba con pecho, espalda, sentadilla o curl.'}
              </Text>
              {loadError && (
                <TouchableOpacity style={styles.retryButton} onPress={() => void loadPage(1, true)}>
                  <Text style={styles.retryText}>REINTENTAR</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <Modal
        visible={!!detail || detailLoading}
        transparent
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {detailLoading || !detail ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color="#CCFF00" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{detail.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {detail.targetLabel} • {detail.equipmentLabel}
                </Text>

                {detail.gifUrl ? (
                  <View style={styles.gifBox}>
                    <Image
                      source={{ uri: detail.gifUrl }}
                      style={styles.gif}
                      resizeMode="contain"
                      accessibilityLabel={`Animación de ${detail.name}`}
                    />
                  </View>
                ) : (
                  <View style={styles.gifPlaceholder}>
                    <Ionicons name="barbell-outline" size={44} color="#666" />
                    <Text style={styles.gifPlaceholderText}>SIN PREVISUALIZACIÓN</Text>
                  </View>
                )}

                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{detail.bodyPartLabel}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{detail.muscleGroupLabel}</Text>
                  </View>
                </View>

                {detail.secondaryMuscleLabels.length > 0 && (
                  <Text style={styles.secondaryMuscles}>
                    También trabaja: {detail.secondaryMuscleLabels.join(', ')}
                  </Text>
                )}

                {detail.steps.length > 0 && (
                  <View style={styles.stepsBlock}>
                    <Text style={styles.stepsTitle}>CÓMO SE HACE</Text>
                    {detail.steps.map((step, index) => (
                      <View key={`${detail.id}-step-${index}`} style={styles.stepRow}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.inputRow}>
                  <View style={styles.inputWrapper}>
                    <Input label="SETS" keyboardType="numeric" value={sets} onChangeText={setSets} maxLength={2} />
                  </View>
                  <View style={{ width: 16 }} />
                  <View style={styles.inputWrapper}>
                    <Input label="REPS" keyboardType="numeric" value={reps} onChangeText={setReps} maxLength={3} />
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  {adding ? (
                    <ActivityIndicator color="#CCFF00" size="large" />
                  ) : (
                    <Button title="AÑADIR A RUTINA" onPress={handleAddExercise} />
                  )}
                  <Button title="VOLVER" variant="outline" onPress={() => setDetail(null)} disabled={adding} />
                </View>

                {detail.attribution && <Text style={styles.attribution}>{detail.attribution}</Text>}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101114',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    paddingHorizontal: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActive: {
    borderColor: '#CCFF00',
  },
  tabText: {
    color: '#A0A0A0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#CCFF00',
  },
  chipRow: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  chipText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#121212',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  clearText: {
    fontSize: 12,
    color: '#FF007F',
    fontWeight: '800',
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  muscleText: {
    fontSize: 12,
    color: '#CCFF00',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  equipmentText: {
    fontSize: 11,
    color: '#A0A0A0',
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  addButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addButtonIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CCFF00',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    marginVertical: 16,
  },
  emptyContainer: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFF00',
  },
  retryText: {
    color: '#CCFF00',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  modalLoader: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#CCFF00',
    marginBottom: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gifBox: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 220,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  gifPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  gifPlaceholderText: {
    color: '#666',
    marginTop: 10,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333',
  },
  badgeText: {
    color: '#A0A0A0',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryMuscles: {
    color: '#A0A0A0',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 17,
  },
  stepsBlock: {
    marginBottom: 20,
  },
  stepsTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#CCFF00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: '#D0D0D0',
    fontSize: 13,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
  },
  modalButtons: {
    marginTop: 8,
  },
  attribution: {
    color: '#555',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});
