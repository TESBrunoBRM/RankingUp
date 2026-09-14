import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { getSupabaseClient } from '../lib/supabase';
import { rankingUpApiClient } from './rankingUpApiClient';

export interface SelectedProgressPhoto { uri: string; width: number; height: number }

export const progressService = {
  async selectPhoto(source: 'gallery' | 'camera'): Promise<SelectedProgressPhoto | null> {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Necesitas dar permiso para seleccionar una foto.');
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return null;
    const { uri, width, height } = result.assets[0];
    return { uri, width, height };
  },

  async uploadPhoto(workoutLogId: string, photo: SelectedProgressPhoto): Promise<string> {
    const longest = Math.max(photo.width, photo.height);
    const resize = longest > 1440 ? photo.width >= photo.height
      ? { width: 1440 } : { height: 1440 } : null;
    const processed = await ImageManipulator.manipulateAsync(photo.uri, resize ? [{ resize }] : [],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
    const base64 = await FileSystem.readAsStringAsync(processed.uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = decode(base64);
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('La foto supera el limite de 5 MB.');
    const signed = await rankingUpApiClient.createProgressUploadUrl({ workoutLogId, contentType: 'image/jpeg', sizeBytes: bytes.byteLength });
    const { error } = await getSupabaseClient().storage.from('progress-photos').uploadToSignedUrl(signed.path, signed.token, bytes, { contentType: 'image/jpeg' });
    if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
    return signed.path;
  },
};
