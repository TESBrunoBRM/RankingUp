import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemePalette } from '../theme';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const theme = useThemePalette();
  return <Image source={compact ? require('../../assets/rankingup-mark-transparent.png') : require('../../assets/rankingup-wordmark-transparent.png')}
    tintColor={theme.accent} contentFit="contain" accessibilityLabel="RankingUp" accessible style={compact ? styles.mark : styles.wordmark} />;
}
const styles = StyleSheet.create({
  wordmark: { width: '100%', maxWidth: 340, height: 108, alignSelf: 'center', marginBottom: 14 },
  mark: { width: 54, height: 54, marginRight: 12 },
});
