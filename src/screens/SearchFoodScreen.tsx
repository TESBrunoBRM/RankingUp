import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { fatSecretService } from '../services/fatSecretService';
import { nutritionLogService } from '../services/nutritionLogService';
import { aiAnalyzerService } from '../services/aiAnalyzerService';
import { useAuthStore } from '../store/authStore';

export default function SearchFoodScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const PRELOADED_FOODS = [
    { food_id: 'pl1', food_name: 'Pechuga de Pollo', food_description: 'Por 100g - Calories: 165kcal | Fat: 3.6g | Carbs: 0g | Protein: 31g' },
    { food_id: 'pl2', food_name: 'Arroz Blanco (Cocido)', food_description: 'Por 100g - Calories: 130kcal | Fat: 0.3g | Carbs: 28g | Protein: 2.7g' },
    { food_id: 'pl3', food_name: 'Huevo Entero (Grande)', food_description: 'Por 1 unidad - Calories: 72kcal | Fat: 4.8g | Carbs: 0.4g | Protein: 6.3g' },
    { food_id: 'pl4', food_name: 'Avena (Hojuelas)', food_description: 'Por 100g - Calories: 389kcal | Fat: 6.9g | Carbs: 66g | Protein: 16.9g' },
    { food_id: 'pl5', food_name: 'Atún en Agua', food_description: 'Por 100g - Calories: 90kcal | Fat: 1.0g | Carbs: 0g | Protein: 20g' },
    { food_id: 'pl6', food_name: 'Manzana', food_description: 'Por 100g - Calories: 52kcal | Fat: 0.2g | Carbs: 14g | Protein: 0.3g' },
    { food_id: 'pl7', food_name: 'Plátano', food_description: 'Por 100g - Calories: 89kcal | Fat: 0.3g | Carbs: 23g | Protein: 1.1g' },
    { food_id: 'pl8', food_name: 'Pera', food_description: 'Por 100g - Calories: 57kcal | Fat: 0.1g | Carbs: 15g | Protein: 0.4g' },
    { food_id: 'pl9', food_name: 'Leche Descremada', food_description: 'Por 100ml - Calories: 34kcal | Fat: 0.1g | Carbs: 5g | Protein: 3.4g' },
    { food_id: 'pl10', food_name: 'Pan Integral', food_description: 'Por 100g - Calories: 247kcal | Fat: 3.4g | Carbs: 41g | Protein: 13g' }
  ];

  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<any[]>(PRELOADED_FOODS);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  
  // Custom serving variables
  const [servings, setServings] = useState('1');
  const [activeUnit, setActiveUnit] = useState<'g' | 'oz' | 'unidad' | 'porcion'>('g');
  const [saving, setSaving] = useState(false);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await fatSecretService.searchFoods(searchQuery);
      setFoods(results);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error buscando alimentos');
    } finally {
      setLoading(false);
    }
  };

  const parseNutrition = (description: string) => {
    let cal = 0; let p = 0; let c = 0; let f = 0;
    try {
      const calMatch = description.match(/Calories:\s*([\d.]+)kcal/i);
      const protMatch = description.match(/Protein:\s*([\d.]+)g/i);
      const carbMatch = description.match(/Carbs:\s*([\d.]+)g/i);
      const fatMatch = description.match(/Fat:\s*([\d.]+)g/i);

      if (calMatch) cal = parseFloat(calMatch[1]);
      if (protMatch) p = parseFloat(protMatch[1]);
      if (carbMatch) c = parseFloat(carbMatch[1]);
      if (fatMatch) f = parseFloat(fatMatch[1]);
    } catch (e) {
       console.log('Error parsing nutrition string:', e);
    }
    return { cal, p, c, f };
  };

  const handleSaveFood = async () => {
    if (!user || !selectedFood) return;
    setSaving(true);
    try {
      const { cal, p, c, f } = parseNutrition(selectedFood.food_description);
      const isPer100 = selectedFood.food_description.includes('100');
      const amountNum = parseFloat(servings) || 0;
      
      let multiplier = 1;
      if (isPer100) {
        let grams = 0;
        if (activeUnit === 'g') grams = amountNum;
        else if (activeUnit === 'oz') grams = amountNum * 28.3495;
        else grams = amountNum * 100; // assume 1 porcion = 100g fallback
        multiplier = grams / 100;
      } else {
        let servs = 0;
        if (activeUnit === 'unidad' || activeUnit === 'porcion') servs = amountNum;
        else if (activeUnit === 'g') servs = amountNum / 100;
        else if (activeUnit === 'oz') servs = (amountNum * 28.3495) / 100;
        multiplier = servs;
      }

      await nutritionLogService.addFoodLog({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        meal_type: 'snack',
        food_name: selectedFood.food_name,
        fatsecret_food_id: selectedFood.food_id,
        calories: cal * multiplier,
        protein: p * multiplier,
        carbs: c * multiplier,
        fat: f * multiplier,
        servings: multiplier
      });
      Alert.alert('Éxito', 'Alimento guardado correctamente');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el alimento');
    } finally {
      setSaving(false);
    }
  };

  const renderImagePickerOptions = () => {
    Alert.alert(
      'Analizar Alimento con IA',
      'Elige el origen de la imagen:',
      [
        { text: 'Tomar Foto', onPress: () => processImageCapture(true) },
        { text: 'Galería', onPress: () => processImageCapture(false) },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const processImageCapture = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para escanear');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería fotográfica');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images || 'images',
      allowsEditing: true,
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return;

    setAnalyzing(true);
    try {
      // Compress image for AI
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, base64: true }
      );

      if (!manipResult.base64) throw new Error("No se pudo codificar la imagen");

      const predictedFoods = await aiAnalyzerService.analyzeImageB64(manipResult.base64);
      
      if (predictedFoods.length > 0) {
        const topFood = predictedFoods[0];
        Alert.alert('IA Completada', `Detectado: ${topFood.food_name}. Buscando calorías reales...`);
        setQuery(topFood.food_name);
        setServings(topFood.servir_tamaño.toString());
        await handleSearch(topFood.food_name);
      } else {
        Alert.alert('Sin resultados', 'La IA no pudo detectar comida en esta foto.');
      }
    } catch (e: any) {
      Alert.alert('Error IA', e.message || 'Fallo el análisis');
    } finally {
      setAnalyzing(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.foodCard} 
      onPress={() => {
        const isPer100 = item.food_description.includes('100');
        setServings(isPer100 ? '100' : '1');
        setActiveUnit(isPer100 ? 'g' : 'unidad');
        setSelectedFood(item);
      }}
    >
      <Text style={styles.foodName}>{item.food_name}</Text>
      <Text style={styles.foodDesc} numberOfLines={2}>{item.food_description}</Text>
      {item.brand_name && <Text style={styles.foodBrand}>{item.brand_name}</Text>}
    </TouchableOpacity>
  );

  const renderDetailView = () => {
    const isPer100 = selectedFood.food_description.includes('100');
    const baseAmount = isPer100 ? 100 : 1;
    const defaultUnitLabel = isPer100 ? 'g' : 'u';
    const amountNum = parseFloat(servings) || 0;
    
    let multiplier = 1;
    if (isPer100) {
      let grams = 0;
      if (activeUnit === 'g') grams = amountNum;
      else if (activeUnit === 'oz') grams = amountNum * 28.3495;
      else grams = amountNum * 100;
      multiplier = grams / 100;
    } else {
      let servs = 0;
      if (activeUnit === 'unidad' || activeUnit === 'porcion') servs = amountNum;
      else if (activeUnit === 'g') servs = amountNum / 100;
      else if (activeUnit === 'oz') servs = (amountNum * 28.3495) / 100;
      multiplier = servs;
    }

    const { cal, p, c, f } = parseNutrition(selectedFood.food_description);

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
          {selectedFood.food_description.split('-')[0].trim()} • valores por {baseAmount} {defaultUnitLabel}
        </Text>

        <View style={styles.macroGrid}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValueKcal}>{cal}</Text>
            <Text style={styles.macroLabel}>KCAL</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{p}g</Text>
            <Text style={styles.macroLabel}>PROT</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{c}g</Text>
            <Text style={styles.macroLabel}>CARBS</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{f}g</Text>
            <Text style={styles.macroLabel}>GRASA</Text>
          </View>
        </View>

        <View style={styles.unitSelectorRow}>
          {['g', 'oz', 'unidad', 'porcion'].map(u => (
            <TouchableOpacity 
              key={u} 
              style={[styles.unitBtn, activeUnit === u && styles.unitBtnActive]}
              onPress={() => {
                setActiveUnit(u as any);
                if (u === 'g') setServings(isPer100 ? '100' : '100');
                if (u === 'oz') setServings('4');
                if (u === 'unidad' || u === 'porcion') setServings('1');
              }}
            >
              <Text style={[styles.unitBtnText, activeUnit === u && styles.unitBtnTextActive]}>
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickAddRow}>
          {[1, 2, 3, 4].map(idx => {
            let displayVal = 0;
            if (activeUnit === 'g') displayVal = idx * 100; // 100, 200, 300, 400
            else if (activeUnit === 'oz') displayVal = idx * 4; // 4, 8, 12, 16 
            else displayVal = idx; // 1, 2, 3, 4
            
            return (
              <TouchableOpacity 
                key={'quick'+displayVal} 
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
              const step = (activeUnit === 'g') ? 10 : (activeUnit === 'oz' ? 1 : 1);
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
              const step = (activeUnit === 'g') ? 10 : (activeUnit === 'oz' ? 1 : 1);
              setServings((amountNum + step).toString());
            }} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerLabel}>Total a registrar</Text>
          <Text style={styles.totalBannerValue}>
            {Math.round(cal * multiplier)} kcal{'   '} 
            <Text style={styles.totalBannerProt}>
              {Math.round(p * multiplier)}g prot
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
              placeholder="Ej: Manzana, Pollo, Avena..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (!text.trim()) setFoods(PRELOADED_FOODS);
              }}
              onSubmitEditing={() => handleSearch(query)}
            />
            <TouchableOpacity style={styles.scanBtn} onPress={renderImagePickerOptions} disabled={analyzing || loading}>
              {analyzing ? <ActivityIndicator color="#121212" size="small" /> : <Ionicons name="camera" size={24} color="#121212" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(query)} disabled={loading || analyzing}>
              {loading ? <ActivityIndicator color="#121212" size="small" /> : <Ionicons name="search" size={20} color="#121212" />}
            </TouchableOpacity>
          </View>

          <FlatList 
            data={foods}
            keyExtractor={(item, index) => item.food_id || String(index)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={!loading && query ? <Text style={styles.emptyText}>No se encontraron resultados.</Text> : null}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 16, color: '#FFFFFF', fontWeight: '900', letterSpacing: 1 },
  searchContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  searchInput: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, color: '#FFF', height: 48, borderWidth: 1, borderColor: '#333' },
  scanBtn: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtn: { width: 48, height: 48, backgroundColor: '#CCFF00', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  foodCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  foodName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  foodDesc: { color: '#A0A0A0', fontSize: 12, lineHeight: 18 },
  foodBrand: { color: '#CCFF00', fontSize: 10, fontWeight: 'bold', marginTop: 8 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  
  detailContainer: { flex: 1, padding: 24, paddingTop: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingVertical: 12 },
  detailBack: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  detailTitle: { fontSize: 18, color: '#FFF', fontWeight: 'bold' },
  foodTitle: { fontSize: 26, fontWeight: '900', color: '#CCFF00', marginBottom: 4 },
  foodSubtitleText: { fontSize: 14, color: '#888', marginBottom: 32 },
  
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  macroBox: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  macroValueKcal: { fontSize: 18, fontWeight: '900', color: '#CCFF00' },
  macroValue: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  macroLabel: { fontSize: 10, color: '#666', marginTop: 4, fontWeight: '800' },

  unitSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#1A1A1A', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  unitBtnActive: { backgroundColor: '#333' },
  unitBtnText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
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
  confirmBtnTextExt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
