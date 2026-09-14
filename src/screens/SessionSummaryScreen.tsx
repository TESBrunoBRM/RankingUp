import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppStackParamList } from '../types';
import { formatDuration } from '../components/SessionTimer';
import { progressService, type SelectedProgressPhoto } from '../services/progressService';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { getErrorMessage } from '../utils/errors';

export default function SessionSummaryScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'SessionSummary'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { summary, name, date } = route.params;
  const [postName, setPostName] = useState(name);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<SelectedProgressPhoto | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('followers');
  const [publishing, setPublishing] = useState(false);

  const choosePhoto = () => Alert.alert('Foto de progreso', 'Elige una fuente', [
    { text: 'Galería', onPress: () => { void progressService.selectPhoto('gallery').then((selected) => { if (selected) { setPhoto(selected); setUploadedPath(null); } }).catch((error) => Alert.alert('Foto', getErrorMessage(error, 'No se pudo abrir la galería.'))); } },
    { text: 'Cámara', onPress: () => { void progressService.selectPhoto('camera').then((selected) => { if (selected) { setPhoto(selected); setUploadedPath(null); } }).catch((error) => Alert.alert('Foto', getErrorMessage(error, 'No se pudo abrir la cámara.'))); } },
    { text: 'Cancelar', style: 'cancel' },
  ]);

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }] });
  const publish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const photoPath = photo ? uploadedPath ?? await progressService.uploadPhoto(summary.workoutLogId, photo) : undefined;
      if (photoPath) setUploadedPath(photoPath);
      await rankingUpApiClient.publishProgress(summary.workoutLogId, { name: postName, description, visibility, photoPath });
      goHome();
    } catch (error) {
      Alert.alert('No se pudo publicar', getErrorMessage(error, 'Tu entrenamiento ya está guardado. Puedes reintentar la publicación.'));
    } finally { setPublishing(false); }
  };

  const omitPublication = () => Alert.alert('Omitir publicación', 'El entrenamiento y el XP se conservarán. ¿Continuar?', [
    { text: 'Volver', style: 'cancel' }, { text: 'Omitir', style: 'destructive', onPress: goHome },
  ]);
  return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <Ionicons name="checkmark-circle" color="#CCFF00" size={42} />
      <Text style={styles.title}>¡ENTRENAMIENTO COMPLETADO!</Text>
      <TextInput style={styles.nameInput} value={postName} onChangeText={setPostName} maxLength={120} accessibilityLabel="Nombre del entrenamiento" />
      <Text style={styles.date}>{new Date(date).toLocaleString('es-CL')}</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.value}>{formatDuration(summary.durationSeconds)}</Text><Text style={styles.label}>DURACIÓN</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{summary.totalVolume} kg</Text><Text style={styles.label}>VOLUMEN</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{summary.setsCompleted}</Text><Text style={styles.label}>SERIES</Text></View>
      </View>
      <Text style={styles.xp}>+{summary.gainedXp} XP</Text>
      {summary.personalRecords.length > 0 ? <View style={styles.records}><Text style={styles.recordsTitle}>NUEVOS RÉCORDS</Text>{summary.personalRecords.map((record) => <Text key={record.exerciseId} style={styles.record}>{record.exerciseId}: {record.previous} → {record.current} kg</Text>)}</View> : null}
      <Pressable onPress={choosePhoto} style={styles.photoSlot}>{photo ? <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" /> : <Ionicons name="image-outline" size={32} color="#CCFF00" />}<Text style={styles.photoText}>{photo ? 'CAMBIAR FOTO' : 'AÑADIR FOTO DE PROGRESO'}</Text></Pressable>
      <Text style={styles.fieldLabel}>DESCRIPCIÓN</Text>
      <TextInput style={styles.description} multiline value={description} onChangeText={setDescription} maxLength={2000} placeholder="¿Cómo ha ido tu entrenamiento?" placeholderTextColor="#777" />
      <Text style={styles.fieldLabel}>VISIBILIDAD</Text>
      <View style={styles.visibilityRow}>{(['public', 'followers', 'private'] as const).map((value) => <Pressable key={value} style={[styles.visibilityOption, visibility === value && styles.visibilityActive]} onPress={() => setVisibility(value)}><Text style={[styles.visibilityText, visibility === value && styles.visibilityTextActive]}>{value === 'public' ? 'PÚBLICO' : value === 'followers' ? 'SEGUIDORES' : 'PRIVADO'}</Text></Pressable>)}</View>
      <Pressable style={styles.primary} onPress={() => void publish()} disabled={publishing}><Text style={styles.primaryText}>{publishing ? 'PUBLICANDO...' : 'PUBLICAR PROGRESO'}</Text></Pressable>
      <Pressable style={styles.secondary} onPress={omitPublication} disabled={publishing}><Text style={styles.secondaryText}>OMITIR PUBLICACIÓN</Text></Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.navigate('WorkoutHistory')}><Text style={styles.historyText}>VER HISTORIAL</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#101114' }, content: { padding: 22, paddingTop: 40, gap: 15 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900' }, nameInput: { color: '#FFF', fontSize: 18, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: '#2B2E35', paddingVertical: 8 },
  date: { color: '#9A9FA6', fontSize: 12 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2E35', paddingVertical: 18, marginVertical: 12 },
  stat: { width: '33%', alignItems: 'center', gap: 5 }, value: { color: '#CCFF00', fontSize: 17, fontWeight: '900' },
  label: { color: '#8C929A', fontSize: 10, fontWeight: '800' }, xp: { color: '#CCFF00', fontSize: 30, fontWeight: '900' },
  records: { gap: 8, paddingVertical: 20 }, recordsTitle: { color: '#FFF', fontSize: 13, fontWeight: '900' }, record: { color: '#C7CBD0', fontSize: 13 },
  primary: { backgroundColor: '#CCFF00', padding: 16, alignItems: 'center', borderRadius: 4, marginTop: 16 },
  primaryText: { color: '#101114', fontWeight: '900', fontSize: 13 }, secondary: { padding: 16, alignItems: 'center' },
  secondaryText: { color: '#B7BDC3', fontWeight: '800', fontSize: 12 },
  photoSlot: { minHeight: 130, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4A5057', borderRadius: 4, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  photo: { width: '100%', height: 170 }, photoText: { color: '#CCFF00', fontSize: 11, fontWeight: '800', paddingBottom: 10 },
  fieldLabel: { color: '#A8ABB0', fontSize: 11, fontWeight: '900', marginTop: 8 },
  description: { minHeight: 100, color: '#FFF', backgroundColor: '#1C1F23', borderRadius: 4, padding: 12, textAlignVertical: 'top' },
  visibilityRow: { flexDirection: 'row', gap: 6 }, visibilityOption: { flex: 1, height: 38, borderWidth: 1, borderColor: '#4A5057', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  visibilityActive: { borderColor: '#CCFF00', backgroundColor: '#27321C' }, visibilityText: { color: '#A8ABB0', fontSize: 10, fontWeight: '900' }, visibilityTextActive: { color: '#CCFF00' },
  historyText: { color: '#CCFF00', fontWeight: '800', fontSize: 12 },
});
