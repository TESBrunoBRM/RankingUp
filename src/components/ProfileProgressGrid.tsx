import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, ProgressPost } from '../types';
import { formatDuration } from './SessionTimer';
import { useAuthStore } from '../store/authStore';

export function ProfileProgressGrid({ profileId, showTitle = true }: { profileId: string; showTitle?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const ownId = useAuthStore((state) => state.user?.id);
  const [posts, setPosts] = useState<ProgressPost[]>([]);
  const [selected, setSelected] = useState<ProgressPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setFailed(false);
    rankingUpApiClient.getProfileProgress(profileId)
      .then((result) => { if (active) setPosts(result.items); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId, attempt]));
  return <View style={styles.section}>
    {showTitle ? <Text style={styles.title}>PROGRESO</Text> : null}
    {loading ? <ActivityIndicator color={theme.accent} style={styles.loading} /> : failed ? <View style={styles.emptyState}><Text accessibilityRole="alert" style={styles.empty}>No se pudo cargar el progreso.</Text><Pressable accessibilityRole="button" style={styles.retry} onPress={() => setAttempt(value => value + 1)}><Text style={styles.retryText}>Reintentar</Text></Pressable></View> : posts.length ? <View style={styles.grid}>{posts.map((post) => <Pressable accessibilityRole="button" accessibilityLabel={post.name ?? 'Ver entrenamiento'} key={post.id} style={styles.tile} onPress={() => setSelected(post)}>
      {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={styles.image} resizeMode="cover" /> : <View style={styles.textTile}><Ionicons name="barbell" color={theme.accent} size={20} /><Text style={styles.tileTitle} numberOfLines={3}>{post.name ?? 'Entrenamiento'}</Text></View>}
    </Pressable>)}</View> : <View style={styles.emptyState}><Ionicons name="grid-outline" size={34} color={theme.muted} /><Text style={styles.emptyTitle}>{ownId === profileId ? 'Tu progreso empieza aquí' : 'Aún no hay publicaciones'}</Text><Text style={styles.empty}>{ownId === profileId ? 'Los entrenamientos que compartas aparecerán en este espacio.' : 'Las publicaciones visibles aparecerán aquí.'}</Text></View>}
    <Modal visible={selected !== null} transparent onRequestClose={() => setSelected(null)} animationType="fade">
      <View style={styles.overlay}><Pressable style={styles.close} onPress={() => setSelected(null)}><Ionicons name="close" color={theme.text} size={25} /></Pressable>
        {selected?.photoUrl ? <Image source={{ uri: selected.photoUrl }} style={styles.fullPhoto} resizeMode="contain" /> : null}
        <Text style={styles.modalTitle}>{selected?.name ?? 'Entrenamiento'}</Text>
        <Text style={styles.meta}>{selected ? `${formatDuration(selected.duration_seconds ?? 0)} · ${Number(selected.total_volume)} kg · +${selected.xp_awarded} XP` : ''}</Text>
        {selected?.description ? <Text style={styles.description}>{selected.description}</Text> : null}
        {selected && ownId !== profileId ? <Pressable accessibilityLabel="Reportar publicación" style={styles.delete} onPress={() => { setSelected(null); navigation.navigate('ReportPost',{postId:selected.id,postTitle:selected.name ?? undefined}); }}><Ionicons name="flag-outline" color={theme.accent} size={18} /><Text style={[styles.deleteText,{color:theme.accent}]}>REPORTAR PUBLICACIÓN</Text></Pressable> : null}
        {selected && ownId === profileId ? <Pressable style={styles.delete} onPress={() => Alert.alert('Eliminar publicación', 'El entrenamiento y el XP se conservarán.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => { void rankingUpApiClient.unpublishProgress(selected.id).then(() => { setPosts((current) => current.filter((post) => post.id !== selected.id)); setSelected(null); }).catch(() => Alert.alert('Error', 'No se pudo eliminar.')); } },
        ])}><Ionicons name="trash-outline" color="#FF6C7C" size={18} /><Text style={styles.deleteText}>ELIMINAR PUBLICACIÓN</Text></Pressable> : null}
      </View>
    </Modal>
  </View>;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  section: { marginTop: 24 }, title: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  loading: { marginVertical: 36 }, emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 12 }, emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }, retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }, retryText: { color: theme.accent, fontWeight: '700' },
  tile: { width: '32.5%', aspectRatio: 1, backgroundColor: theme.surface }, image: { width: '100%', height: '100%' },
  textTile: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, gap: 7 }, tileTitle: { color: theme.text, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  empty: { color: theme.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' }, overlay: { flex: 1, backgroundColor: '#101114F0', alignItems: 'center', justifyContent: 'center', padding: 20 },
  close: { position: 'absolute', top: 50, right: 20, zIndex: 1 }, fullPhoto: { width: '100%', height: '55%' }, modalTitle: { color: theme.text, fontSize: 19, fontWeight: '900', marginTop: 18 },
  meta: { color: theme.accent, fontSize: 12, marginTop: 8 }, description: { color: theme.text, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 15 },
  delete: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 25, padding: 12 }, deleteText: { color: '#FF6C7C', fontWeight: '800', fontSize: 11 },
});
