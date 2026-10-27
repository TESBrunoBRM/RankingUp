import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <Image source={compact ? require('../../assets/icon.png') : require('../../assets/rankingup-wordmark.png')}
    contentFit="contain" accessibilityLabel="RankingUp" accessible style={compact ? styles.mark : styles.wordmark} />;
}
const styles = StyleSheet.create({
  wordmark: { width: '100%', maxWidth: 340, height: 108, backgroundColor: '#000000', borderRadius: 12, alignSelf: 'center', marginBottom: 14 },
  mark: { width: 54, height: 54, borderRadius: 12, marginRight: 12, backgroundColor: '#000000' },
});
