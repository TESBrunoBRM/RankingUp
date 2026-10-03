import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, TouchableWithoutFeedback } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function PlanningMenuModal() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const { isPlanningMenuOpen, setPlanningMenuOpen } = useUIStore();
  const navigation = useNavigation<NavigationProp>();
  
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlanningMenuOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
         Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
         Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [isPlanningMenuOpen]);

  return (
    <Modal visible={isPlanningMenuOpen} transparent animationType="none" onRequestClose={() => setPlanningMenuOpen(false)}>
       <TouchableWithoutFeedback onPress={() => setPlanningMenuOpen(false)}>
         <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
           <TouchableWithoutFeedback>
             <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
               
               <View style={styles.handleIndicator} />
               <Text style={styles.title}>CREAR RUTINA</Text>

               <TouchableOpacity 
                 style={styles.btn} 
                 onPress={() => { setPlanningMenuOpen(false); navigation.navigate('AIPlanning'); }}
               >
                 <View style={[styles.btnIcon, { backgroundColor: 'rgba(204,255,0,0.1)' }]}>
                    <Ionicons name="sparkles" size={20} color={theme.accent} />
                 </View>
                 <View style={styles.btnContent}>
                   <Text style={styles.btnTitle}>Planificación con IA</Text>
                   <Text style={styles.btnSub}>Plan personalizado en 4 pasos</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#666" />
               </TouchableOpacity>

               <TouchableOpacity 
                 style={styles.btn} 
                 onPress={() => { setPlanningMenuOpen(false); navigation.navigate('MainTabs', { screen: 'CreateTab' }); }}
               >
                 <View style={[styles.btnIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <Ionicons name="build" size={20} color={theme.text} />
                 </View>
                 <View style={styles.btnContent}>
                   <Text style={styles.btnTitle}>Planificación Manual</Text>
                   <Text style={styles.btnSub}>Crea desde cero tu propia rutina</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#666" />
               </TouchableOpacity>

               <TouchableOpacity 
                 style={styles.btn} 
                 onPress={() => { setPlanningMenuOpen(false); navigation.navigate('MainTabs', { screen: 'RoutineTab' }); }}
               >
                 <View style={[styles.btnIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Ionicons name="play" size={20} color="#A0A0A0" />
                 </View>
                 <View style={styles.btnContent}>
                   <Text style={styles.btnTitle}>Registrar Entrenamiento</Text>
                   <Text style={styles.btnSub}>Inicia un log de una rutina existente</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#666" />
               </TouchableOpacity>

               <TouchableOpacity 
                 style={styles.btn} 
                 onPress={() => { setPlanningMenuOpen(false); navigation.navigate('Minigames'); }}
               >
                 <View style={[styles.btnIcon, { backgroundColor: 'rgba(255,45,85,0.1)' }]}>
                    <Ionicons name="game-controller" size={20} color="#FF2D55" />
                 </View>
                 <View style={styles.btnContent}>
                   <Text style={styles.btnTitle}>Minijuegos</Text>
                   <Text style={styles.btnSub}>Desafíos interactivos de fitness</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#666" />
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.closeBtn} onPress={() => setPlanningMenuOpen(false)}>
                 <Text style={styles.closeText}>CANCELAR</Text>
               </TouchableOpacity>

             </Animated.View>
           </TouchableWithoutFeedback>
         </Animated.View>
       </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handleIndicator: { width: 40, height: 4, backgroundColor: theme.surface, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 13, color: theme.muted, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  btnIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  btnContent: { flex: 1 },
  btnTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 4 },
  btnSub: { fontSize: 12, color: theme.muted, fontWeight: '500' },
  closeBtn: { marginTop: 10, padding: 16, alignItems: 'center' },
  closeText: { color: theme.muted, fontWeight: '800', fontSize: 12, letterSpacing: 1 }
});
