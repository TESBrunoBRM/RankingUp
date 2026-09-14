import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDuration } from './SessionTimer';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, ProgressPost } from '../types';
import { useAuthStore } from '../store/authStore';

export function ProgressPostCard({ post, onDeleted }: { post: ProgressPost; onDeleted?: (id: string) => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const ownId = useAuthStore((state) => state.user?.id);
  const [liked, setLiked] = useState(post.likedByMe);
  const [count, setCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);
  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await rankingUpApiClient.likeProgress(post.id, !liked);
      setLiked(!liked); setCount((value) => value + (liked ? -1 : 1));
    } catch { Alert.alert('No se pudo actualizar el me gusta', 'Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  const removePost = () => Alert.alert('Eliminar publicación', 'El entrenamiento y el XP se conservarán. La foto se borrará.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => {
      void rankingUpApiClient.unpublishProgress(post.id).then(() => onDeleted?.(post.id))
        .catch(() => Alert.alert('Error', 'No se pudo eliminar la publicación.'));
    } },
  ]);
  return <View style={styles.card}>
    <View style={styles.headerRow}><Pressable onPress={() => ownId === post.user_id ? navigation.navigate('Profile') : navigation.navigate('PublicProfile', { profileId: post.user_id })} style={styles.authorRow}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(post.author?.name ?? 'U').charAt(0).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.author}>{post.author?.name ?? 'Usuario'}</Text><Text style={styles.date}>{new Date(post.published_at).toLocaleDateString('es-CL')}</Text></View>
      <Ionicons name="chevron-forward" size={16} color="#767C83" />
    </Pressable>
    {ownId === post.user_id ? <Pressable style={styles.delete} onPress={removePost} accessibilityLabel="Eliminar publicación"><Ionicons name="trash-outline" size={18} color="#FF6C7C" /></Pressable> : null}</View>
    {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={styles.photo} resizeMode="cover" accessibilityLabel={`Progreso de ${post.author?.name ?? 'usuario'}`} /> : null}
    <View style={styles.body}><Text style={styles.title}>{post.name ?? 'Entrenamiento'}</Text>
      <Text style={styles.stats}>{formatDuration(post.duration_seconds ?? 0)}  ·  {Number(post.total_volume)} kg  ·  +{post.xp_awarded} XP</Text>
      {post.description ? <Text style={styles.description}>{post.description}</Text> : null}
      <Pressable onPress={() => void toggleLike()} style={styles.like} accessibilityLabel={liked ? 'Quitar me gusta' : 'Dar me gusta'}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#FF496C' : '#AEB5BF'} /><Text style={styles.likeCount}>{count}</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1C1F23', borderWidth: 1, borderColor: '#2B2E35', borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' }, authorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 13, gap: 10 }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#CCFF00', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#101114', fontWeight: '900' }, author: { color: '#FFF', fontSize: 13, fontWeight: '800' }, date: { color: '#838A93', fontSize: 11 },
  photo: { width: '100%', aspectRatio: 1 }, body: { padding: 13, gap: 7 }, title: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  stats: { color: '#CCFF00', fontSize: 11, fontWeight: '700' }, description: { color: '#C5C8CC', fontSize: 13, lineHeight: 19 },
  like: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 5, minHeight: 36 }, likeCount: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  delete: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
});
