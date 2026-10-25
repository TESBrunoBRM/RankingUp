import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';

export function ProfilePage({
  title,
  children,
  loading = false,
  error,
  onRetry,
}: {
  title: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const navigation = useNavigation();
  const theme = useThemePalette();
  const styles = useThemedStyles(createProfileStyles);
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              {onRetry ? (
                <Pressable accessibilityRole="button" style={styles.retry} onPress={onRetry}>
                  <Text style={styles.link}>Reintentar</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {loading ? <ActivityIndicator color={theme.accent} style={styles.loading} /> : children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const createProfileStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
      paddingHorizontal: 8,
    },
    content: { padding: 20, paddingBottom: 40, gap: 16 },
    label: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderRadius: 12,
      color: theme.text,
      fontSize: 16,
      padding: 14,
    },
    bioInput: { minHeight: 110, textAlignVertical: 'top' },
    description: { color: theme.muted, fontSize: 14, lineHeight: 21 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionTitle: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginTop: 12,
    },
    group: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    settingsRow: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLabel: { color: theme.text, fontSize: 15, fontWeight: '600' },
    rowDescription: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: 52 },
    errorBox: { borderRadius: 12, backgroundColor: theme.warningSurface, padding: 14 },
    error: { color: theme.warningText, fontSize: 14, lineHeight: 21 },
    retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    link: { color: theme.accent, fontWeight: '700', fontSize: 14 },
    loading: { marginVertical: 36 },
    option: {
      flex: 1,
      minHeight: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    optionActive: { backgroundColor: theme.accentFill, borderColor: theme.accentFill },
    optionText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
    optionTextActive: { color: '#182018' },
    estimate: { padding: 18, backgroundColor: theme.surface, borderRadius: 14, gap: 8 },
    estimateValue: { color: theme.text, fontSize: 26, fontWeight: '800' },
  });
