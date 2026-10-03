import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, secureTextEntry, ...props }) => {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, secureTextEntry ? styles.passwordInput : null, style]}
          placeholderTextColor={theme.muted}
          {...props}
          secureTextEntry={Boolean(secureTextEntry && !passwordVisible)}
        />
        {secureTextEntry ? <Pressable
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={styles.visibilityButton}
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        ><Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#AAB1BA" /></Pressable> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: theme.muted, // Light gray for labels
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    height: 56,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    backgroundColor: theme.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.text,
  },
  passwordInput: { paddingRight: 0 },
  visibilityButton: { width: 52, height: 54, alignItems: 'center', justifyContent: 'center' },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 6,
  },
});
