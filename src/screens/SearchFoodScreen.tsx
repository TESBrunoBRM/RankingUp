import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fatSecretService } from '../services/fatSecretService';
import { nutritionLogService } from '../services/nutritionLogService';
import { useAuthStore } from '../store/authStore';
import { AppStackParamList, FoodSearchResult, NutritionUnit } from '../types';
import { getLocalDateString } from '../utils/date';

type SearchFoodNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SearchFood'>;
type SearchFoodRouteProp = RouteProp<AppStackParamList, 'SearchFood'>;

const UNIT_OPTIONS: NutritionUnit[] = ['g', 'ml', 'oz', 'unidad', 'porcion'];

const getInitialUnit = (food: FoodSearchResult): NutritionUnit => {
  if (food.serving.unit === 'ml') return 'ml';
  if (food.serving.isPer100) return 'g';
  return food.serving.unit;
};

const getServingMultiplier = (food: FoodSearchResult, amount: number, unit: NutritionUnit): number => {
  if (amount <= 0) return 0;

  if (unit === 'oz') {
    return (amount * 28.3495) / 100;
  }

  if (unit === 'g' || unit === 'ml') {
    return food.serving.isPer100 ? amount / 100 : amount / Math.max(food.serving.amount, 1);
  }

  return amount;
};

export default function SearchFoodScreen() {
  const navigation = useNavigation<SearchFoodNavigationProp>();
  const route = useRoute<SearchFoodRouteProp>();
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState('100');
  const [activeUnit, setActiveUnit] = useState<NutritionUnit>('g');
  const [saving, setSaving] = useState(false);

  const selectFood = (food: FoodSearchResult) => {
    setServings(food.serving.amount.toString());
    setActiveUnit(getInitialUnit(food));
    setSelectedFood(food);
  };

  const handleSearch = async (searchQuery: string = query) => {
    setLoading(true);
    try {
      const results = await fatSecretService.searchFoods(searchQuery);
      setFoods(results);
    } catch {
      Alert.alert('Error', 'No se pudo buscar alimentos. Revisa la conexion con el backend.');
      setFoods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route.params?.scannedFood) {
      selectFood(route.params.scannedFood);
      navigation.setParams({ scannedFood: undefined });
      return;
    }
    if (route.params?.initialQuery) {
      setQuery(route.params.initialQuery);
      handleSearch(route.params.initialQuery);
      navigation.setParams({ initialQuery: undefined });
    }
  }, [route.params?.initialQuery, route.params?.scannedFood]);

  const totals = useMemo(() => {
    if (!selectedFood) return { multiplier: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
    const amountNum = parseFloat(servings) || 0;
    const multiplier = getServingMultiplier(selectedFood, amountNum, activeUnit);
    return {
      multiplier,
      calories: selectedFood.serving.calories * multiplier,
      protein: selectedFood.serving.protein * multiplier,
      carbs: selectedFood.serving.carbs * multiplier,
      fat: selectedFood.serving.fat * multiplier,
    };
  }, [activeUnit, selectedFood, servings]);

  const handleSaveFood = async () => {
    if (!user || !selectedFood) return;
    setSaving(true);
    try {
      await nutritionLogService.addFoodLog({
        date: getLocalDateString(),
        meal_type: 'snack',
        fatsecret_food_id: selectedFood.food_id,
        servings: parseFloat(servings) || 0,
        unit: activeUnit,
      });
      Alert.alert('Listo', 'Alimento guardado correctamente');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el alimento');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: FoodSearchResult }) => (
    <TouchableOpacity style={styles.foodCard} onPress={() => selectFood(item)}>
      <View style={styles.foodHeader}>
        <Text style={styles.foodName}>{item.food_name}</Text>
        {item.source && <Text style={styles.sourcePill}>
          {item.source === 'ai' ? 'IA' : item.source === 'community' ? 'COMUNIDAD' : item.source === 'proxy' ? 'API' : 'BACKEND'}
        </Text>}
      </View>
      <Text style={styles.foodDesc} numberOfLines={2}>{item.food_description}</Text>
      {item.brand_name ? <Text style={styles.foodBrand}>{item.brand_name}</Text> : null}
    </TouchableOpacity>
  );

  const renderDetailView = () => {
    if (!selectedFood) return null;

    const amountNum = parseFloat(servings) || 0;
    const baseUnitLabel = selectedFood.serving.unit === 'porcion' ? 'porc.' : selectedFood.serving.unit;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedFood(null)} style={styles.detailBack}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Registrar alimento</Text>
        </View>

        <Text style={styles.foodTitle}>{selectedFood.food_name}</Text>
        <Text style={styles.foodSubtitleText}>
          {selectedFood.serving.description} - valores base por {selectedFood.serving.amount} {baseUnitLabel}
        </Text>

        {selectedFood.source === 'ai' ? (
          <View style={styles.aiNotice}>
            <Ionicons name="sparkles-outline" size={18} color="#FFB020" />
            <Text style={styles.aiNoticeText}>Estimacion de IA. Revisa la porcion y los macros antes de guardar.</Text>
          </View>
        ) : null}

        <View style={styles.macroGrid}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValueKcal}>{Math.round(selectedFood.serving.calories)}</Text>
            <Text style={styles.macroLabel}>KCAL</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{selectedFood.serving.protein}g</Text>
            <Text style={styles.macroLabel}>PROT</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{selectedFood.serving.carbs}g</Text>
            <Text style={styles.macroLabel}>CARB</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{selectedFood.serving.fat}g</Text>
            <Text style={styles.macroLabel}>GRASA</Text>
          </View>
        </View>

        <View style={styles.unitSelectorRow}>
          {UNIT_OPTIONS.map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[styles.unitBtn, activeUnit === unit && styles.unitBtnActive]}
              onPress={() => {
                setActiveUnit(unit);
                if (unit === 'g') setServings('100');
                if (unit === 'ml') setServings('100');
                if (unit === 'oz') setServings('4');
                if (unit === 'unidad' || unit === 'porcion') setServings('1');
              }}
            >
              <Text style={[styles.unitBtnText, activeUnit === unit && styles.unitBtnTextActive]}>
                {unit === 'porcion' ? 'Porc.' : unit.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickAddRow}>
          {[1, 2, 3, 4].map((idx) => {
            const displayVal = activeUnit === 'g' || activeUnit === 'ml' ? idx * 100 : activeUnit === 'oz' ? idx * 4 : idx;
            return (
              <TouchableOpacity
                key={`${activeUnit}-${displayVal}`}
                style={[styles.quickAddBtn, amountNum === displayVal && styles.quickAddBtnActive]}
                onPress={() => setServings(displayVal.toString())}
              >
                <Text style={[styles.quickAddText, amountNum === displayVal && styles.quickAddTextActive]}>
                  {displayVal} {activeUnit === 'unidad' || activeUnit === 'porcion' ? 'u' : activeUnit}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.amountInputContainer}>
          <Text style={styles.amountInputLabel}>Cantidad ({activeUnit})</Text>
          <View style={styles.stepperControl}>
            <TouchableOpacity onPress={() => {
              const step = activeUnit === 'g' || activeUnit === 'ml' ? 10 : 1;
              setServings(Math.max(0, amountNum - step).toString());
            }} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>

            <View style={styles.stepperInputWrapper}>
              <TextInput
                style={styles.stepperInput}
                keyboardType="numeric"
                value={servings}
                onChangeText={setServings}
              />
              <Text style={styles.stepperUnit}>{activeUnit === 'unidad' || activeUnit === 'porcion' ? 'u' : activeUnit}</Text>
            </View>

            <TouchableOpacity onPress={() => {
              const step = activeUnit === 'g' || activeUnit === 'ml' ? 10 : 1;
              setServings((amountNum + step).toString());
            }} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerLabel}>Total a registrar</Text>
          <Text style={styles.totalBannerValue}>
            {Math.round(totals.calories)} kcal{'   '}
            <Text style={styles.totalBannerProt}>
              {Math.round(totals.protein)}g prot
            </Text>
          </Text>
        </View>

        <View style={styles.actionBaseRow}>
          <TouchableOpacity style={styles.cancelBtnExt} onPress={() => setSelectedFood(null)}>
            <Text style={styles.cancelBtnTextExt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtnExt} onPress={handleSaveFood} disabled={saving}>
            <Text style={styles.confirmBtnTextExt}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {selectedFood ? renderDetailView() : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>BUSCAR ALIMENTO</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Ej: manzana, pollo, avena..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (!text.trim()) setFoods([]);
              }}
              onSubmitEditing={() => handleSearch(query)}
            />
            <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('CameraScanner')} disabled={loading}>
              <Ionicons name="camera" size={24} color="#121212" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(query)} disabled={loading}>
              {loading ? <ActivityIndicator color="#121212" size="small" /> : <Ionicons name="search" size={20} color="#121212" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.contributeButton} onPress={() => navigation.navigate('FoodSubmission')}>
            <Ionicons name="add-circle-outline" size={20} color="#CCFF00" />
            <View style={styles.contributeTextWrap}>
              <Text style={styles.contributeTitle}>¿NO ENCUENTRAS EL ALIMENTO?</Text>
              <Text style={styles.contributeText}>Aporta su etiqueta o una foto para revision.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#777" />
          </TouchableOpacity>

          <FlatList
            data={foods}
            keyExtractor={(item) => item.food_id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Busca un alimento para registrar tu comida.</Text> : null}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 16, color: '#FFFFFF', fontWeight: '900', letterSpacing: 1 },
  searchContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  searchInput: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, color: '#FFF', height: 48, borderWidth: 1, borderColor: '#333' },
  scanBtn: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtn: { width: 48, height: 48, backgroundColor: '#CCFF00', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  foodCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  foodHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  foodName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 },
  foodDesc: { color: '#A0A0A0', fontSize: 12, lineHeight: 18 },
  foodBrand: { color: '#CCFF00', fontSize: 10, fontWeight: 'bold', marginTop: 8 },
  sourcePill: { color: '#121212', backgroundColor: '#CCFF00', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: '900' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  contributeButton: { marginHorizontal: 20, marginBottom: 4, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A', flexDirection: 'row', alignItems: 'center', gap: 12 },
  contributeTextWrap: { flex: 1 },
  contributeTitle: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  contributeText: { color: '#888', fontSize: 11, marginTop: 2 },

  detailContainer: { flex: 1, padding: 24, paddingTop: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingVertical: 12 },
  detailBack: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  detailTitle: { fontSize: 18, color: '#FFF', fontWeight: 'bold' },
  foodTitle: { fontSize: 26, fontWeight: '900', color: '#CCFF00', marginBottom: 4 },
  foodSubtitleText: { fontSize: 14, color: '#888', marginBottom: 32 },
  aiNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#211D14', borderRadius: 8, borderWidth: 1, borderColor: '#594719', padding: 12, marginTop: -20, marginBottom: 24 },
  aiNoticeText: { color: '#E6D7AC', fontSize: 12, lineHeight: 17, flex: 1 },

  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  macroBox: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  macroValueKcal: { fontSize: 18, fontWeight: '900', color: '#CCFF00' },
  macroValue: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  macroLabel: { fontSize: 10, color: '#666', marginTop: 4, fontWeight: '800' },

  unitSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#1A1A1A', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  unitBtnActive: { backgroundColor: '#333' },
  unitBtnText: { color: '#666', fontWeight: 'bold', fontSize: 11 },
  unitBtnTextActive: { color: '#FFF' },

  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAddBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 12, marginHorizontal: 4, alignItems: 'center' },
  quickAddBtnActive: { borderColor: '#CCFF00', backgroundColor: 'rgba(204,255,0,0.1)' },
  quickAddText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  quickAddTextActive: { color: '#CCFF00' },

  amountInputContainer: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: '#333' },
  amountInputLabel: { color: '#888', fontSize: 14, fontWeight: '500' },
  stepperControl: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#444', justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  stepperInputWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  stepperInput: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', minWidth: 45 },
  stepperUnit: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  totalBanner: { backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  totalBannerLabel: { color: '#888', fontSize: 14, fontWeight: '500' },
  totalBannerValue: { color: '#CCFF00', fontSize: 16, fontWeight: 'bold' },
  totalBannerProt: { color: '#CCFF00', fontWeight: '600' },

  actionBaseRow: { flexDirection: 'row', gap: 12 },
  cancelBtnExt: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#444', alignItems: 'center' },
  cancelBtnTextExt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  confirmBtnExt: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  confirmBtnTextExt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
