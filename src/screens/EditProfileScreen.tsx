import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProfilePage, createProfileStyles } from '../components/ProfilePage';
import { Button } from '../components/Button';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { getErrorMessage } from '../utils/errors';
import { useThemePalette, useThemedStyles } from '../theme';

export default function EditProfileScreen() {
  const styles = useThemedStyles(createProfileStyles);
  const theme = useThemePalette();
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { profile } = await rankingUpApiClient.getOwnProfile();
      setName(profile.name);
      setUsername(profile.username);
      setBio(profile.bio);
      setLoaded(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el perfil.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const save = async () => {
    if (name.trim().length < 2) {
      setError('El nombre debe tener entre 2 y 40 caracteres.');
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(username.trim())) {
      setError('Usa entre 3 y 24 letras minúsculas, números o guiones bajos en tu usuario.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await rankingUpApiClient.updateSocialProfile({
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
      });
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el perfil.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <ProfilePage
      title="Editar perfil"
      loading={loading}
      error={error}
      onRetry={!loaded ? () => void load() : undefined}
    >
      {loaded ? (
        <>
          <Text style={styles.description}>Así te ven los demás en RankingUp.</Text>
          <View>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              accessibilityLabel="Nombre"
              style={styles.input}
              value={name}
              onChangeText={setName}
              maxLength={40}
              editable={!saving}
            />
          </View>
          <View>
            <Text style={styles.label}>Nombre de usuario</Text>
            <TextInput
              accessibilityLabel="Nombre de usuario"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              editable={!saving}
            />
            <Text style={styles.rowDescription}>Letras minúsculas, números y guion bajo.</Text>
          </View>
          <View>
            <Text style={styles.label}>Biografía</Text>
            <TextInput
              accessibilityLabel="Biografía"
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={140}
              editable={!saving}
              placeholder="Algo sobre ti"
              placeholderTextColor={theme.muted}
            />
            <Text style={styles.rowDescription}>{bio.length}/140</Text>
          </View>
          <Button title="Guardar cambios" loading={saving} onPress={() => void save()} />
        </>
      ) : null}
    </ProfilePage>
  );
}
