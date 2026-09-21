import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { foodImageService, type FoodPhoto } from '../services/foodImageService';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, FoodImageAnalysisResponse, NutritionUnit } from '../types';
import { getErrorMessage } from '../utils/errors';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'FoodSubmission'>;
type SourceMode = 'nutrition_label' | 'ai_estimate';

const UNITS: NutritionUnit[] = ['g', 'ml', 'unidad', 'porcion'];

export default function FoodSubmissionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [sourceMode, setSourceMode] = useState<SourceMode>('nutrition_label');
  const [photo, setPhoto] = useState<FoodPhoto | null>(null);
  const [analysis, setAnalysis] = useState<FoodImageAnalysisResponse | null>(null);
  const [imagePath, setImagePath] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [servingAmount, setServingAmount] = useState('100');
  const [servingUnit, setServingUnit] = useState<NutritionUnit>('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');

  const fillFromAnalysis = (result: FoodImageAnalysisResponse) => {
    setFoodName(result.food.food_name);
    setBrandName(result.food.brand_name ?? '');
    setServingAmount(String(result.food.serving.amount));
    setServingUnit(result.food.serving.unit);
    setCalories(String(result.food.serving.calories));
    setProtein(String(result.food.serving.protein));
    setCarbs(String(result.food.serving.carbs));
    setFat(String(result.food.serving.fat));
  };

  const handlePhoto = async (source: 'camera' | 'gallery') => {
    setProcessing(true);
    try {
      const selected = await foodImageService.selectPhoto(source);
      if (!selected) return;
      setPhoto(selected);
      setAnalysis(null);
      const path = await foodImageService.upload(selected);
      setImagePath(path);
      try {
        const result = await rankingUpApiClient.analyzeFoodImage({
          imagePath: path,
          mode: sourceMode === 'nutrition_label' ? 'nutrition_label' : 'meal',
        });
        setAnalysis(result);
        fillFromAnalysis(result);
      } catch (error: unknown) {
        if (sourceMode === 'nutrition_label') {
          Alert.alert('Completa los datos', `${getErrorMessage(error, 'No se pudo leer la etiqueta.')} Puedes transcribirla manualmente.`);
        } else {
          Alert.alert('Analisis no disponible', getErrorMessage(error, 'La IA es necesaria cuando el alimento no tiene etiqueta.'));
        }
      }
    } catch (error: unknown) {
      Alert.alert('No se pudo procesar la foto', getErrorMessage(error, 'Intenta nuevamente.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    const values = [servingAmount, calories, protein, carbs, fat].map(Number);
    if (!imagePath || !foodName.trim() || values.some((value) => !Number.isFinite(value) || value < 0) || values[0] <= 0) {
      Alert.alert('Faltan datos', 'Agrega una foto y completa nombre, porcion y macronutrientes.');
      return;
    }
    if (sourceMode === 'ai_estimate' && !analysis) {
      Alert.alert('Analisis pendiente', 'Sin tabla nutricional se requiere un analisis de IA valido antes de enviar.');
      return;
    }
    setSaving(true);
    try {
      await rankingUpApiClient.createFoodSubmission({
        foodName: foodName.trim(), brandName: brandName.trim() || undefined,
        barcode: barcode.trim() || undefined, servingAmount: values[0], servingUnit,
        calories: values[1], protein: values[2], carbs: values[3], fat: values[4],
        imagePath, sourceMode, scanAnalysisId: analysis?.analysisId,
        submitterNotes: notes.trim() || undefined,
      });
      Alert.alert('Aporte enviado', 'Un administrador revisara los datos antes de incorporarlos al catalogo.', [
        { text: 'Listo', onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      Alert.alert('No se pudo enviar', getErrorMessage(error, 'Revisa los datos e intenta nuevamente.'));
    } finally {
      setSaving(false);
    }
  };

  const numericField = (label: string, value: string, onChangeText: (value: string) => void) => (
    <View style={styles.numericField}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#666" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Volver" style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>APORTAR ALIMENTO</Text>
          <Text style={styles.subtitle}>REVISION DE LA COMUNIDAD</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.segmented}>
            <TouchableOpacity style={[styles.segment, sourceMode === 'nutrition_label' && styles.segmentActive]} onPress={() => { setSourceMode('nutrition_label'); setAnalysis(null); }}>
              <Ionicons name="document-text-outline" size={18} color={sourceMode === 'nutrition_label' ? '#101114' : '#AAA'} />
              <Text style={[styles.segmentText, sourceMode === 'nutrition_label' && styles.segmentTextActive]}>Tiene etiqueta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segment, sourceMode === 'ai_estimate' && styles.segmentActive]} onPress={() => { setSourceMode('ai_estimate'); setAnalysis(null); }}>
              <Ionicons name="sparkles-outline" size={18} color={sourceMode === 'ai_estimate' ? '#101114' : '#AAA'} />
              <Text style={[styles.segmentText, sourceMode === 'ai_estimate' && styles.segmentTextActive]}>Analizar con IA</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photoPanel}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} /> : <Ionicons name="image-outline" size={46} color="#555" />}
            <Text style={styles.photoTitle}>{sourceMode === 'nutrition_label' ? 'FOTO DE LA TABLA NUTRICIONAL' : 'FOTO CLARA DEL ALIMENTO'}</Text>
            <Text style={styles.photoHelp}>{sourceMode === 'nutrition_label' ? 'La foto es obligatoria; puedes corregir los valores detectados.' : 'La IA estimara porcion, calorias y macronutrientes.'}</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={() => void handlePhoto('camera')} disabled={processing}>
                <Ionicons name="camera-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={() => void handlePhoto('gallery')} disabled={processing}>
                <Ionicons name="images-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            {processing ? <View style={styles.processing}><ActivityIndicator color="#CCFF00" /><Text style={styles.processingText}>SUBIENDO Y ANALIZANDO</Text></View> : null}
            {analysis ? <Text style={styles.confidence}>Confianza estimada: {Math.round(analysis.confidence * 100)}%</Text> : null}
          </View>

          <Text style={styles.label}>Nombre del alimento</Text>
          <TextInput style={styles.input} value={foodName} onChangeText={setFoodName} placeholder="Ej: Yogur natural" placeholderTextColor="#666" />
          <View style={styles.twoColumns}>
            <View style={styles.column}><Text style={styles.label}>Marca</Text><TextInput style={styles.input} value={brandName} onChangeText={setBrandName} placeholder="Opcional" placeholderTextColor="#666" /></View>
            <View style={styles.column}><Text style={styles.label}>Codigo de barras</Text><TextInput style={styles.input} value={barcode} onChangeText={setBarcode} keyboardType="number-pad" placeholder="Opcional" placeholderTextColor="#666" /></View>
          </View>

          <View style={styles.twoColumns}>
            <View style={styles.column}>{numericField('Cantidad por porcion', servingAmount, setServingAmount)}</View>
            <View style={styles.column}>
              <Text style={styles.label}>Unidad</Text>
              <View style={styles.unitRow}>{UNITS.map((unit) => <TouchableOpacity key={unit} style={[styles.unit, servingUnit === unit && styles.unitActive]} onPress={() => setServingUnit(unit)}><Text style={[styles.unitText, servingUnit === unit && styles.unitTextActive]}>{unit}</Text></TouchableOpacity>)}</View>
            </View>
          </View>
          <View style={styles.macroFields}>
            {numericField('Kcal', calories, setCalories)}
            {numericField('Proteina g', protein, setProtein)}
            {numericField('Carbos g', carbs, setCarbs)}
            {numericField('Grasa g', fat, setFat)}
          </View>
          <Text style={styles.label}>Notas para el administrador</Text>
          <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="Origen, sabor, tamaño u otra aclaracion" placeholderTextColor="#666" />
          <TouchableOpacity style={[styles.submitButton, (saving || processing) && styles.disabled]} onPress={() => void handleSubmit()} disabled={saving || processing}>
            {saving ? <ActivityIndicator color="#101114" /> : <><Ionicons name="send" size={18} color="#101114" /><Text style={styles.submitText}>ENVIAR A REVISION</Text></>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: '#101114' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#24262A' },
  iconButton: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { marginLeft: 14 }, title: { color: '#FFF', fontSize: 16, fontWeight: '900' }, subtitle: { color: '#777', fontSize: 9, fontWeight: '800', marginTop: 2 },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  segmented: { flexDirection: 'row', backgroundColor: '#1A1A1A', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  segment: { flex: 1, minHeight: 44, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentActive: { backgroundColor: '#CCFF00' }, segmentText: { color: '#AAA', fontSize: 12, fontWeight: '800' }, segmentTextActive: { color: '#101114' },
  photoPanel: { alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, borderWidth: 1, borderColor: '#333', padding: 16, marginTop: 4 },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: 6, marginBottom: 14 }, photoTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', marginTop: 10 },
  photoHelp: { color: '#888', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 5 }, photoActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  photoButton: { width: 48, height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#444', alignItems: 'center', justifyContent: 'center' },
  processing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, processingText: { color: '#CCFF00', fontSize: 10, fontWeight: '900' }, confidence: { color: '#57C7FF', fontSize: 11, fontWeight: '800', marginTop: 10 },
  label: { color: '#A0A0A0', fontSize: 10, fontWeight: '900', marginTop: 6 }, input: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A', color: '#FFF', paddingHorizontal: 13 },
  twoColumns: { flexDirection: 'row', gap: 10 }, column: { flex: 1 }, macroFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, numericField: { flexGrow: 1, flexBasis: 130 },
  unitRow: { flexDirection: 'row', gap: 4, minHeight: 46, alignItems: 'center' }, unit: { flex: 1, height: 36, borderRadius: 6, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' }, unitActive: { backgroundColor: '#333', borderColor: '#CCFF00' }, unitText: { color: '#777', fontSize: 9, fontWeight: '800' }, unitTextActive: { color: '#FFF' },
  notes: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top' }, submitButton: { minHeight: 52, borderRadius: 8, backgroundColor: '#CCFF00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10 }, submitText: { color: '#101114', fontSize: 12, fontWeight: '900' }, disabled: { opacity: 0.45 },
});
