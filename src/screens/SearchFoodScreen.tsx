import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fatSecretService } from '../services/fatSecretService';
import { nutritionLogService } from '../services/nutritionLogService';
import { useAuthStore } from '../store/authStore';
import { AppStackParamList, FoodImageAnalysisResponse, FoodSearchResult, NutritionUnit } from '../types';
import { getLocalDateString } from '../utils/date';

type SearchFoodNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SearchFood'>;
type SearchFoodRouteProp = RouteProp<AppStackParamList, 'SearchFood'>;

const unitOptions = (food: FoodSearchResult): NutritionUnit[] =>
  food.serving.unit === 'g' ? ['g', 'oz'] : [food.serving.unit];

const getInitialUnit = (food: FoodSearchResult): NutritionUnit => {
  if (food.serving.unit === 'ml') return 'ml';
  if (food.serving.isPer100) return 'g';
  return food.serving.unit;
};

const getServingMultiplier = (food: FoodSearchResult, amount: number, unit: NutritionUnit): number => {
  if (amount <= 0) return 0;

  if (unit === 'oz' && food.serving.unit === 'g') return (amount * 28.3495) / food.serving.amount;
  return unit === food.serving.unit ? amount / food.serving.amount : 0;
};

export default function SearchFoodScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
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
  const [scanAnalysis, setScanAnalysis] = useState<FoodImageAnalysisResponse | null>(null);
  const [scanPhotoUri, setScanPhotoUri] = useState<string | undefined>();
  const [aiFoodName, setAiFoodName] = useState('');
  const [aiCalories, setAiCalories] = useState('');
  const [aiProtein, setAiProtein] = useState('');
  const [aiCarbs, setAiCarbs] = useState('');
  const [aiFat, setAiFat] = useState('');

  const selectFood = (food: FoodSearchResult) => {
    setServings(food.serving.amount.toString());
    setActiveUnit(getInitialUnit(food));
    setSelectedFood(food);
    setAiFoodName(food.food_name);
    setAiCalories(String(food.serving.calories));
    setAiProtein(String(food.serving.protein));
    setAiCarbs(String(food.serving.carbs));
    setAiFat(String(food.serving.fat));
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
      setScanAnalysis(route.params.scannedAnalysis ?? null);
      setScanPhotoUri(route.params.photoUri);
      navigation.setParams({ scannedFood: undefined, scannedAnalysis: undefined, photoUri: undefined });
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
    const base = selectedFood.source === 'ai' ? {
      calories: Number(aiCalories.replace(',', '.')) || 0,
      protein: Number(aiProtein.replace(',', '.')) || 0,
      carbs: Number(aiCarbs.replace(',', '.')) || 0,
      fat: Number(aiFat.replace(',', '.')) || 0,
    } : selectedFood.serving;
    return {
      multiplier,
      calories: base.calories * multiplier,
      protein: base.protein * multiplier,
      carbs: base.carbs * multiplier,
      fat: base.fat * multiplier,
    };
  }, [activeUnit, selectedFood, servings, aiCalories, aiProtein, aiCarbs, aiFat]);

  const handleSaveFood = async () => {
    if (!user || !selectedFood) return;
    const amount = Number(servings.replace(',', '.'));
    const macroValues = [aiCalories, aiProtein, aiCarbs, aiFat].map((value) => Number(value.replace(',', '.')));
    if (!Number.isFinite(amount) || amount <= 0 || (selectedFood.source === 'ai' &&
      (!aiFoodName.trim() || [aiCalories, aiProtein, aiCarbs, aiFat].some((value) => !value.trim())
        || macroValues.some((value) => !Number.isFinite(value) || value < 0)))) {
      Alert.alert('Revisa los datos', 'La cantidad y los valores nutricionales deben ser válidos.');
      return;
    }
    setSaving(true);
    try {
      await nutritionLogService.addFoodLog({
        date: getLocalDateString(),
        meal_type: 'snack',
        fatsecret_food_id: selectedFood.food_id,
        servings: amount,
        unit: activeUnit,
        correction: selectedFood.source === 'ai' ? {
          foodName: aiFoodName.trim(), calories: macroValues[0], protein: macroValues[1],
          carbs: macroValues[2], fat: macroValues[3],
        } : undefined,
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
          {item.source === 'ai' ? 'IA' : item.source === 'community' ? 'COMUNIDAD' : item.source === 'usda' ? 'USDA' : item.source === 'proxy' ? 'API' : 'BACKEND'}
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
        <ScrollView contentContainerStyle={styles.detailScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedFood(null)} style={styles.detailBack}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
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
            <Text style={styles.aiNoticeText}>
              {scanAnalysis?.visibleFoods?.length ? `Detectado: ${scanAnalysis.visibleFoods.join(', ')}. ` : ''}
              Estimacion de IA. {scanAnalysis?.notes ?? 'Revisa la porcion y los macros antes de guardar.'}
            </Text>
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
        {selectedFood.source === 'ai' ? <View style={styles.correctionPanel}>
          <Text style={styles.correctionTitle}>CORRIGE EL RESULTADO DE LA IA</Text>
          <TextInput style={styles.correctionInput} value={aiFoodName} onChangeText={setAiFoodName} placeholder="Nombre del alimento" placeholderTextColor={theme.muted} />
          <View style={styles.correctionGrid}>
            {([['Kcal', aiCalories, setAiCalories], ['Proteína g', aiProtein, setAiProtein], ['Carbos g', aiCarbs, setAiCarbs], ['Grasa g', aiFat, setAiFat]] as const).map(([label, value, setter]) =>
              <View key={label} style={styles.correctionField}><Text style={styles.correctionLabel}>{label}</Text><TextInput style={styles.correctionInput} value={value} onChangeText={setter} keyboardType="decimal-pad" /></View>)}
          </View>
          <Text style={styles.correctionHelp}>Valores para la porción base indicada arriba. El total se ajusta según la cantidad elegida.</Text>
        </View> : null}

        <View style={styles.unitSelectorRow}>
          {unitOptions(selectedFood).map((unit) => (
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
        {selectedFood.source === 'ai' && scanAnalysis ? (
          <TouchableOpacity style={styles.contributeButton} onPress={() => navigation.navigate('FoodSubmission', {
            initialAnalysis: { ...scanAnalysis, food: { ...scanAnalysis.food, food_name: aiFoodName.trim() || scanAnalysis.food.food_name,
              serving: { ...scanAnalysis.food.serving, calories: Number(aiCalories) || 0, protein: Number(aiProtein) || 0,
                carbs: Number(aiCarbs) || 0, fat: Number(aiFat) || 0 } } }, photoUri: scanPhotoUri,
          })}>
            <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
            <Text style={styles.contributeTitle}>CORREGIR Y APORTAR AL CATÁLOGO</Text>
          </TouchableOpacity>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {selectedFood ? renderDetailView() : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>BUSCAR ALIMENTO</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Ej: manzana, pollo, avena..."
              placeholderTextColor={theme.muted}
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
            <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
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

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 16, color: theme.text, fontWeight: '900', letterSpacing: 1 },
  searchContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  searchInput: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 16, color: theme.text, height: 48, borderWidth: 1, borderColor: theme.border },
  scanBtn: { width: 48, height: 48, backgroundColor: theme.surface, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtn: { width: 48, height: 48, backgroundColor: theme.accentFill, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  foodCard: { backgroundColor: theme.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  foodHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  foodName: { color: theme.text, fontSize: 16, fontWeight: '800', flex: 1 },
  foodDesc: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  foodBrand: { color: theme.accent, fontSize: 10, fontWeight: 'bold', marginTop: 8 },
  sourcePill: { color: '#121212', backgroundColor: theme.accentFill, overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: '900' },
  emptyText: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  contributeButton: { marginHorizontal: 20, marginBottom: 4, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  contributeTextWrap: { flex: 1 },
  contributeTitle: { color: theme.text, fontSize: 11, fontWeight: '900' },
  contributeText: { color: theme.muted, fontSize: 11, marginTop: 2 },

  detailContainer: { flex: 1 },
  detailScroll: { padding: 24, paddingTop: 10, paddingBottom: 48 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingVertical: 12 },
  detailBack: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  detailTitle: { fontSize: 18, color: theme.text, fontWeight: 'bold' },
  foodTitle: { fontSize: 26, fontWeight: '900', color: theme.accent, marginBottom: 4 },
  foodSubtitleText: { fontSize: 14, color: theme.muted, marginBottom: 32 },
  aiNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.warningSurface, borderRadius: 8, borderWidth: 1, borderColor: '#594719', padding: 12, marginTop: -20, marginBottom: 24 },
  aiNoticeText: { color: theme.warningText, fontSize: 12, lineHeight: 17, flex: 1 },
  correctionPanel: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 18 },
  correctionTitle: { color: theme.text, fontSize: 11, fontWeight: '900', marginBottom: 10 },
  correctionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  correctionField: { width: '47%' },
  correctionLabel: { color: theme.muted, fontSize: 10, marginBottom: 3 },
  correctionInput: { color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, minHeight: 40, backgroundColor: theme.background },
  correctionHelp: { color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },

  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  macroBox: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  macroValueKcal: { fontSize: 18, fontWeight: '900', color: theme.accent },
  macroValue: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  macroLabel: { fontSize: 10, color: theme.muted, marginTop: 4, fontWeight: '800' },

  unitSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: theme.surface, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  unitBtnActive: { backgroundColor: theme.surface },
  unitBtnText: { color: theme.muted, fontWeight: 'bold', fontSize: 11 },
  unitBtnTextActive: { color: theme.text },

  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAddBtn: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 12, marginHorizontal: 4, alignItems: 'center' },
  quickAddBtnActive: { borderColor: theme.accent, backgroundColor: 'rgba(204,255,0,0.1)' },
  quickAddText: { color: theme.muted, fontWeight: 'bold', fontSize: 12 },
  quickAddTextActive: { color: theme.accent },

  amountInputContainer: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: theme.border },
  amountInputLabel: { color: theme.muted, fontSize: 14, fontWeight: '500' },
  stepperControl: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
  stepperInputWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  stepperInput: { color: theme.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', minWidth: 45 },
  stepperUnit: { color: theme.text, fontSize: 16, fontWeight: 'bold' },

  totalBanner: { backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  totalBannerLabel: { color: theme.muted, fontSize: 14, fontWeight: '500' },
  totalBannerValue: { color: theme.accent, fontSize: 16, fontWeight: 'bold' },
  totalBannerProt: { color: theme.accent, fontWeight: '600' },

  actionBaseRow: { flexDirection: 'row', gap: 12 },
  cancelBtnExt: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelBtnTextExt: { color: theme.text, fontWeight: 'bold', fontSize: 16 },
  confirmBtnExt: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  confirmBtnTextExt: { color: theme.text, fontWeight: 'bold', fontSize: 16 },
});
