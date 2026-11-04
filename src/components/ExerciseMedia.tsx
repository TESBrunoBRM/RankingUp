import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemePalette } from '../theme';

type Props = { name: string; gifUrl?: string | null; thumbnailUrl?: string | null; compact?: boolean; style?: StyleProp<ViewStyle> };
export function ExerciseMedia(props: Props) {
  // A different exercise resets loading/failure state, including recycled list rows.
  return <MediaContent key={`${props.name}:${props.gifUrl}:${props.thumbnailUrl}`} {...props} />;
}
function MediaContent({ name, gifUrl, thumbnailUrl, compact, style }: Props) {
  const theme = useThemePalette();
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const candidates = compact ? [thumbnailUrl, gifUrl] : [gifUrl, thumbnailUrl];
  const uri = candidates.find((url): url is string => Boolean(url && !failed.includes(url)));
  return <View style={[styles.box, { backgroundColor: theme.surfaceAlt }, style]}>
    {uri ? <>
      <Image key={`${uri}:${attempt}`} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="disk" autoplay={!compact} recyclingKey={uri} accessibilityLabel={`${compact ? 'Miniatura' : uri === gifUrl ? 'Demostración animada' : 'Imagen de referencia'} de ${name}`} onLoadStart={() => setLoading(true)} onLoad={() => setLoading(false)} onError={() => { setLoading(true); setFailed(current => [...current, uri]); }} />
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {!compact && !loading && uri !== gifUrl ? <Text style={{ position: 'absolute', bottom: 0, backgroundColor: theme.surface, color: theme.text, padding: 6, fontSize: 11 }}>Imagen de referencia · animación no disponible</Text> : null}
    </> : <>
      <Ionicons name="barbell-outline" size={compact ? 20 : 32} color={theme.muted} />
      {!compact ? <>
        <Text style={{ color: theme.text, textAlign: 'center' }}>{gifUrl || thumbnailUrl ? 'No se pudo cargar la demostración.' : 'Demostración todavía no disponible.'}</Text>
        <Text style={{ color: theme.muted, textAlign: 'center', fontSize: 12 }}>Revisa las instrucciones antes de comenzar.</Text>
        {gifUrl || thumbnailUrl ? <Pressable accessibilityRole="button" onPress={() => { setFailed([]); setLoading(true); setAttempt(value => value + 1); }} style={styles.retry}><Text style={{ color: theme.accent, fontWeight: '700' }}>Reintentar imagen</Text></Pressable> : null}
      </> : null}
    </>}
  </View>;
}
const styles = StyleSheet.create({ box: { minHeight: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 8, borderRadius: 10 }, retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 } });
