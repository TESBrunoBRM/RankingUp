import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { ProgressPost } from '../types';
import { formatDuration } from './SessionTimer';
import { useAuthStore } from '../store/authStore';

export function ProfileProgressGrid({ profileId }: { profileId: string }) {
  const ownId = useAuthStore((state) => state.user?.id);
  const [posts, setPosts] = useState<ProgressPost[]>([]);
  const [selected, setSelected] = useState<ProgressPost | null>(null);
  useEffect(() => {
    let active = true;
    rankingUpApiClient.getProfileProgress(profileId).then((result) => { if (active) setPosts(result.items); }).catch(() => undefined);
    return () => { active = false; };
  }, [profileId]);
  return <View style={styles.section}>
    <Text style={styles.title}>PROGRESO</Text>
    {posts.length ? <View style={styles.grid}>{posts.map((post) => <Pressable key={post.id} style={styles.tile} onPress={() => setSelected(post)}>
      {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={styles.image} resizeMode="cover" /> : <View style={styles.textTile}><Ionicons name="barbell" color="#CCFF00" size={20} /><Text style={styles.tileTitle} numberOfLines={3}>{post.name ?? 'Entrenamiento'}</Text></View>}
    </Pressable>)}</View> : <Text style={styles.empty}>Aún no hay publicaciones visibles.</Text>}
    <Modal visible={selected !== null} transparent onRequestClose={() => setSelected(null)} animationType="fade">
      <View style={styles.overlay}><Pressable style={styles.close} onPress={() => setSelected(null)}><Ionicons name="close" color="#FFF" size={25} /></Pressable>
        {selected?.photoUrl ? <Image source={{ uri: selected.photoUrl }} style={styles.fullPhoto} resizeMode="contain" /> : null}
        <Text style={styles.modalTitle}>{selected?.name ?? 'Entrenamiento'}</Text>
        <Text style={styles.meta}>{selected ? `${formatDuration(selected.duration_seconds ?? 0)} · ${Number(selected.total_volume)} kg · +${selected.xp_awarded} XP` : ''}</Text>
        {selected?.description ? <Text style={styles.description}>{selected.description}</Text> : null}
        {selected && ownId === profileId ? <Pressable style={styles.delete} onPress={() => Alert.alert('Eliminar publicación', 'El entrenamiento y el XP se conservarán.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => { void rankingUpApiClient.unpublishProgress(selected.id).then(() => { setPosts((current) => current.filter((post) => post.id !== selected.id)); setSelected(null); }).catch(() => Alert.alert('Error', 'No se pudo eliminar.')); } },
        ])}><Ionicons name="trash-outline" color="#FF6C7C" size={18} /><Text style={styles.deleteText}>ELIMINAR PUBLICACIÓN</Text></Pressable> : null}
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 24 }, title: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  tile: { width: '32.5%', aspectRatio: 1, backgroundColor: '#24272D' }, image: { width: '100%', height: '100%' },
  textTile: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, gap: 7 }, tileTitle: { color: '#FFF', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  empty: { color: '#858C94', fontSize: 12 }, overlay: { flex: 1, backgroundColor: '#101114F0', alignItems: 'center', justifyContent: 'center', padding: 20 },
  close: { position: 'absolute', top: 50, right: 20, zIndex: 1 }, fullPhoto: { width: '100%', height: '55%' }, modalTitle: { color: '#FFF', fontSize: 19, fontWeight: '900', marginTop: 18 },
  meta: { color: '#CCFF00', fontSize: 12, marginTop: 8 }, description: { color: '#D5D8DB', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 15 },
  delete: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 25, padding: 12 }, deleteText: { color: '#FF6C7C', fontWeight: '800', fontSize: 11 },
});
