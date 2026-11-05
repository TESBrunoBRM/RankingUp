import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useThemePalette } from '../theme';
import { useUIStore } from '../store/uiStore';

const destinations: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { label: 'Inicio', icon: 'compass-outline' },
  RoutineTab: { label: 'Rutinas', icon: 'barbell-outline' },
  NutritionTab: { label: 'Nutrición', icon: 'restaurant-outline' },
  ReportsTab: { label: 'Informes', icon: 'analytics-outline' },
};

export function MainTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useThemePalette();
  const openPlanning = useUIStore(store => store.setPlanningMenuOpen);
  const training = state.routes.some(route => route.name === 'RoutineTab');
  const tab = (route: typeof state.routes[number]) => {
    const destination = destinations[route.name];
    if (!destination) return null;
    const focused = state.routes[state.index].key === route.key;
    const options = descriptors[route.key].options;
    const color = focused ? theme.accent : theme.muted;
    return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} aria-selected={focused}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? destination.label} testID={`tab-${route.name}`}
      style={styles.tab} onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key });
      }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}>
      <Ionicons name={destination.icon} size={25} color={color} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.35} style={[styles.label, { color }]}>{destination.label}</Text>
    </Pressable>;
  };
  return <View style={[styles.bar, { backgroundColor: theme.background, borderTopColor: theme.border,
    paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: Math.max(insets.left, insets.right) }]}>
    <View style={styles.row}>
      {training ? <>
        <View style={styles.side}>{state.routes.filter(route => route.name === 'HomeTab' || route.name === 'RoutineTab').map(tab)}</View>
        <View style={styles.center}>
          <Pressable accessibilityRole="button" accessibilityLabel="Crear rutina" accessibilityHint="Abre las opciones de planificación"
            testID="tab-create" onPress={() => openPlanning(true)}
            style={({ pressed }) => [styles.create, { backgroundColor: theme.accentFill, borderColor: theme.background, opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="add" size={32} color="#182018" />
          </Pressable>
        </View>
        <View style={styles.side}>{state.routes.filter(route => route.name === 'NutritionTab' || route.name === 'ReportsTab').map(tab)}</View>
      </> : state.routes.map(tab)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 68 },
  side: { flex: 2, flexDirection: 'row', minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  tab: { flex: 1, minWidth: 0, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2 },
  label: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  create: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -12 }] },
});
