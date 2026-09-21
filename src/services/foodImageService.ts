import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { getSupabaseClient } from '../lib/supabase';
import type { FoodImageAnalysisResponse } from '../types';
import { rankingUpApiClient } from './rankingUpApiClient';

export interface FoodPhoto {
  uri: string;
  width?: number;
  height?: number;
}

const preparePhoto = async (photo: FoodPhoto) => {
  const longest = Math.max(photo.width ?? 0, photo.height ?? 0);
  const resize = longest > 1280
    ? (photo.width ?? 0) >= (photo.height ?? 0) ? { width: 1280 } : { height: 1280 }
    : null;
  const processed = await ImageManipulator.manipulateAsync(
    photo.uri,
    resize ? [{ resize }] : [],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
  );
  const base64 = await FileSystem.readAsStringAsync(processed.uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = decode(base64);
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('La foto debe pesar menos de 5 MB.');
  }
  return bytes;
};

export const foodImageService = {
  async selectPhoto(source: 'camera' | 'gallery'): Promise<FoodPhoto | null> {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Necesitas dar permiso para seleccionar una foto.');
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0];
  },

  async upload(photo: FoodPhoto): Promise<string> {
    const bytes = await preparePhoto(photo);
    const signed = await rankingUpApiClient.createFoodImageUploadUrl({
      contentType: 'image/jpeg', sizeBytes: bytes.byteLength,
    });
    const { error } = await getSupabaseClient().storage.from('food-evidence')
      .uploadToSignedUrl(signed.path, signed.token, bytes, { contentType: 'image/jpeg' });
    if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
    return signed.path;
  },

  async uploadAndAnalyze(
    photo: FoodPhoto,
    mode: 'meal' | 'nutrition_label',
  ): Promise<FoodImageAnalysisResponse> {
    const imagePath = await this.upload(photo);
    return rankingUpApiClient.analyzeFoodImage({ imagePath, mode });
  },
};
