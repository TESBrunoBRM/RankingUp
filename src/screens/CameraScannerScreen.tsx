import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types';
import * as ImageManipulator from 'expo-image-manipulator';
import { aiAnalyzerService } from '../services/aiAnalyzerService';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'CameraScanner'>;

export default function CameraScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<React.ElementRef<typeof CameraView> | null>(null);
  const navigation = useNavigation<NavigationProp>();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Necesitamos acceso a la cámara para escanear.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, base64: true }
      );

      if (!manipResult.base64) throw new Error("No se pudo codificar la imagen");

      const predictedFoods = await aiAnalyzerService.analyzeImageB64(manipResult.base64);
      
      if (predictedFoods.length > 0) {
        const topFood = predictedFoods[0];
        setIsProcessing(false);
        navigation.navigate('SearchFood', { initialQuery: topFood.food_name });
      } else {
        Alert.alert('Modo demo', 'No hay IA externa configurada. Puedes buscar alimentos manualmente con el catálogo del backend.');
        setIsProcessing(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falló el análisis';
      Alert.alert('Error IA', message);
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>RANKINGUP</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Scanner Reticle */}
          <View style={styles.reticleContainer}>
             <View style={[styles.corner, styles.topLeft]} />
             <View style={[styles.corner, styles.topRight]} />
             <View style={[styles.corner, styles.bottomLeft]} />
             <View style={[styles.corner, styles.bottomRight]} />
             {isProcessing && (
                <View style={styles.processingBadge}>
                  <ActivityIndicator size="small" color="#121212" />
                  <Text style={styles.processingText}>ANALIZANDO...</Text>
                </View>
             )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <Text style={styles.hint}>Encuadra el plato y pulsa para analizarlo</Text>
            <TouchableOpacity
              style={[styles.captureBtn, isProcessing && styles.captureBtnDisabled]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { color: '#CCFF00', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  
  reticleContainer: { width: 280, height: 280, alignSelf: 'center', marginTop: -50, justifyContent: 'flex-start', alignItems: 'flex-start' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#CCFF00', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  
  processingBadge: { position: 'absolute', top: -20, left: 20, backgroundColor: '#CCFF00', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8 },
  processingText: { color: '#121212', fontWeight: 'bold', fontSize: 12 },

  controls: { paddingBottom: 50, alignItems: 'center' },

  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' },
  captureBtnDisabled: { opacity: 0.5 },
  
  hint: { color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 24, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  permissionText: { color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#CCFF00', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#121212', fontWeight: 'bold', fontSize: 16 }
});
