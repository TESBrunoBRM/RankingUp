import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { AppStackParamList, ProfileSearchResult } from '../types';
import { getErrorMessage } from '../utils/errors';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'DiscoverProfiles'>;

export default function DiscoverProfilesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const search = async () => {
    if (query.trim().length < 2) {
      setErrorMessage('Escribe al menos 2 caracteres.');
      return;
    }
    try {
      setLoading(true);
      setErrorMessage('');
      setResults(await rankingUpApiClient.searchProfiles(query.trim()));
      setSearched(true);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo buscar atletas.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>ATLETAS</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#777777" />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Nombre o @usuario"
            placeholderTextColor="#666666"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void search()}
          />
        </View>
        <Pressable accessibilityLabel="Buscar" style={styles.searchButton} onPress={() => void search()}>
          {loading ? <ActivityIndicator color="#121212" /> : <Ionicons name="arrow-forward" size={20} color="#121212" />}
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => navigation.navigate('PublicProfile', { profileId: item.id })}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.resultCopy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.username}>@{item.username} · {item.xp} XP</Text>
              {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
            {item.isFollowing ? <Text style={styles.following}>SIGUIENDO</Text> : <Ionicons name="chevron-forward" size={20} color="#666666" />}
          </Pressable>
        )}
        ListEmptyComponent={searched && !loading ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color="#444444" />
            <Text style={styles.emptyTitle}>SIN RESULTADOS</Text>
            <Text style={styles.emptyText}>Prueba con otro nombre de usuario.</Text>
          </View>
        ) : !searched ? (
          <View style={styles.empty}>
            <Ionicons name="fitness-outline" size={40} color="#CCFF00" />
            <Text style={styles.emptyTitle}>ENCUENTRA TU EQUIPO</Text>
            <Text style={styles.emptyText}>Busca atletas para seguir su progreso y comparar marcas.</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#242424' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  searchRow: { flexDirection: 'row', gap: 10, padding: 16 },
  searchBox: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 8, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333' },
  input: { flex: 1, color: '#FFFFFF', marginLeft: 9 },
  searchButton: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#CCFF00', alignItems: 'center', justifyContent: 'center' },
  error: { color: '#FFB020', fontSize: 12, paddingHorizontal: 18, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  resultRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#292929', paddingVertical: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2C3614', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#CCFF00', fontSize: 20, fontWeight: '900' },
  resultCopy: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  username: { color: '#8D8D8D', fontSize: 11, marginTop: 3 },
  bio: { color: '#666666', fontSize: 11, marginTop: 4 },
  following: { color: '#CCFF00', fontSize: 9, fontWeight: '900' },
  empty: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 14 },
  emptyText: { color: '#777777', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
});
