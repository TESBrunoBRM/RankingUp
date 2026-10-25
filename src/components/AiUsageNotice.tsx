import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import type { BillingStatus } from '../types/billing';
import type { AppStackParamList } from '../types';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';

export function AiUsageNotice({ refreshKey }: { refreshKey?: string }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void rankingUpApiClient
        .getBilling()
        .then((result) => {
          if (active) setStatus(result);
        })
        .catch(() => {
          if (active) setStatus(null);
        });
      return () => {
        active = false;
      };
    }, [refreshKey]),
  );
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.row}
      onPress={() => navigation.navigate('Billing')}
    >
      <Ionicons name="sparkles-outline" size={16} color={theme.accent} />
      <Text style={styles.text}>
        {status?.mode === 'disabled'
          ? 'Conoce los planes de RankingUp'
          : status?.plan === 'pro'
            ? 'Pro · IA sin cuota mensual'
            : status
              ? `${status.remaining} usos de IA disponibles · Bolsa compartida`
              : 'Consultar mis usos de IA'}
      </Text>
      <Ionicons name="chevron-forward" size={15} color={theme.muted} />
    </Pressable>
  );
}
const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginBottom: 8 },
    text: { flex: 1, color: theme.muted, fontSize: 12, lineHeight: 18 },
  });
