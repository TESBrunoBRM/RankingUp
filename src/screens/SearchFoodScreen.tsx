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
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  
  // Custom serving variables
  const [servings, setServings] = useState('1');
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
      const multiplier = parseFloat(servings) || 1;

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
      onPress={() => setSelectedFood(item)}
    >
      <Text style={styles.foodName}>{item.food_name}</Text>
      <Text style={styles.foodDesc} numberOfLines={2}>{item.food_description}</Text>
      {item.brand_name && <Text style={styles.foodBrand}>{item.brand_name}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
        />
        <TouchableOpacity style={styles.scanBtn} onPress={renderImagePickerOptions} disabled={analyzing || loading}>
          {analyzing ? <ActivityIndicator color="#121212" size="small" /> : <Ionicons name="camera" size={24} color="#121212" />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(query)} disabled={loading || analyzing}>
          {loading ? <ActivityIndicator color="#121212" size="small" /> : <Ionicons name="search" size={20} color="#121212" />}
        </TouchableOpacity>
      </View>

      {selectedFood ? (
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.saveContainer}>
           <Text style={styles.selectedName}>{selectedFood.food_name}</Text>
           <Text style={styles.selectedDesc}>{selectedFood.food_description}</Text>
           
           <View style={styles.servingRow}>
             <Text style={styles.servingLabel}>Porción / Multiplicador:</Text>
             <TextInput 
               style={styles.servingInput}
               keyboardType="numeric"
               value={servings}
               onChangeText={setServings}
             />
           </View>

           <View style={styles.actionRow}>
             <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedFood(null)}>
               <Text style={styles.cancelBtnText}>CANCELAR</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveFood} disabled={saving}>
               <Text style={styles.confirmBtnText}>{saving ? 'GUARDANDO...' : 'GUARDAR'}</Text>
             </TouchableOpacity>
           </View>
         </KeyboardAvoidingView>
      ) : (
        <FlatList 
          data={foods}
          keyExtractor={(item, index) => item.food_id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading && query ? <Text style={styles.emptyText}>No se encontraron resultados.</Text> : null}
        />
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
  
  saveContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  selectedName: { fontSize: 24, fontWeight: '900', color: '#CCFF00', marginBottom: 12 },
  selectedDesc: { fontSize: 14, color: '#A0A0A0', marginBottom: 24, lineHeight: 22 },
  servingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 24 },
  servingLabel: { color: '#FFF', fontWeight: 'bold' },
  servingInput: { backgroundColor: '#121212', borderWidth: 1, borderColor: '#333', color: '#FFF', width: 60, height: 40, borderRadius: 8, textAlign: 'center', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#666', alignItems: 'center' },
  cancelBtnText: { color: '#A0A0A0', fontWeight: '800' },
  confirmBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#CCFF00', alignItems: 'center' },
  confirmBtnText: { color: '#121212', fontWeight: '900' }
});
