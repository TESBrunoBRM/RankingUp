import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';

export function SetTypeSheet({ visible, onSelect, onClose }: {
  visible: boolean; onSelect: (kind: 'normal' | 'warmup') => void; onClose: () => void;
}) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={styles.sheet}>
        <Text style={styles.title}>TIPO DE SERIE</Text>
        <Pressable style={styles.option} onPress={() => onSelect('normal')}><Text style={styles.normal}>1</Text><Text style={styles.label}>Normal</Text></Pressable>
        <Pressable style={styles.option} onPress={() => onSelect('warmup')}><Text style={styles.warmup}>W</Text><Text style={styles.label}>Calentamiento</Text></Pressable>
      </View>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1C1F23', padding: 24, paddingBottom: 42, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  title: { color: '#CCFF00', fontSize: 15, fontWeight: '900', marginBottom: 18 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 55, borderTopWidth: 1, borderTopColor: '#2B2E35' },
  normal: { color: '#CCFF00', fontSize: 18, fontWeight: '800', width: 28 },
  warmup: { color: '#FF9F0A', fontSize: 18, fontWeight: '800', width: 28 },
  label: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
