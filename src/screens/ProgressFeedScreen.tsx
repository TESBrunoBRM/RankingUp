import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressPostCard } from '../components/ProgressPostCard';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, ProgressPost } from '../types';

export default function ProgressFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [posts, setPosts] = useState<ProgressPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { const result = await rankingUpApiClient.getProgressFeed(); setPosts(result.items); setCursor(result.nextCursor); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try { const result = await rankingUpApiClient.getProgressFeed(cursor); setPosts((current) => [...current, ...result.items]); setCursor(result.nextCursor); }
    catch { setError(true); }
    finally { setLoadingMore(false); }
  };
  return <SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFF" /></Pressable><Text style={styles.title}>PROGRESO</Text></View>
    {loading ? <ActivityIndicator style={{ flex: 1 }} color="#CCFF00" /> : error && posts.length === 0 ? <Pressable style={styles.center} onPress={() => void load()}><Text style={styles.empty}>No se pudo cargar. Toca para reintentar.</Text></Pressable> :
      <FlatList data={posts} keyExtractor={(post) => post.id} renderItem={({ item }) => <ProgressPostCard post={item} onDeleted={(id) => setPosts((current) => current.filter((post) => post.id !== id))} />}
        contentContainerStyle={styles.list} onEndReached={() => void more()} onEndReachedThreshold={0.4}
        ListEmptyComponent={<Text style={styles.empty}>Sigue a otros usuarios o publica un entrenamiento para ver progreso aquí.</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#CCFF00" /> : error ? <Text style={styles.empty}>No se pudieron cargar más publicaciones.</Text> : null} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101114' }, header: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: '#2B2E35' }, title: { color: '#FFF', fontSize: 19, fontWeight: '900' }, list: { padding: 16, flexGrow: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, empty: { color: '#9A9FA6', textAlign: 'center', paddingVertical: 40, fontSize: 13 } });
