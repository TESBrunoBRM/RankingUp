import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { appEnv } from '../config/env';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';

export const LEGAL_VERSION = '2026-10-02';

const sections = [
  ['Uso de la aplicación', 'RankingUp permite registrar entrenamiento, nutrición y actividad social. Debes proporcionar información veraz, usar la aplicación lícitamente y respetar a otras personas. Podemos moderar aportes y suspender usos abusivos conforme a la ley aplicable.'],
  ['Salud y nutrición', 'Los planes, metas y cálculos nutricionales son orientativos y no sustituyen una evaluación médica o nutricional. La foto de un plato no permite conocer con certeza ingredientes, peso, cocción ni porción. Revisa y corrige los resultados de IA antes de registrarlos. Si tienes una condición de salud, consulta a un profesional.'],
  ['Fotos e inteligencia artificial', 'Cuando eliges analizar una foto, la imagen se sube a un almacenamiento privado y se envía al proveedor de IA configurado para identificar alimentos y estimar nutrientes. Evita incluir rostros, documentos u otros datos ajenos. Puedes registrar alimentos sin usar la cámara. Los resultados pueden ser incorrectos y no garantizamos una identificación perfecta.'],
  ['Aportes al catálogo', 'Si envías un alimento, autorizas a RankingUp a revisar su foto y datos y a mostrar el nombre y valores nutricionales aprobados a otros usuarios. Garantizas que puedes compartir el contenido. Un administrador puede corregir, rechazar o retirar aportes. Las estimaciones de IA no se publican automáticamente como datos verificados.'],
  ['Datos y privacidad', 'Tratamos los datos de cuenta, perfil, entrenamiento, nutrición y fotos para operar la app, mantener seguridad y atender solicitudes. El perfil público y las interacciones sociales son visibles según la configuración elegida. Usamos proveedores de autenticación, almacenamiento y análisis de imágenes que pueden procesar datos bajo sus propias condiciones. Conservamos los datos mientras la cuenta esté activa o por los plazos exigidos por ley. Puedes solicitar acceso, rectificación o eliminación mediante el contacto indicado abajo, sujeto a las excepciones legales.'],
  ['Disponibilidad y cambios', 'Podemos actualizar funciones y estos términos. Cuando cambie una versión que requiera nueva aceptación, la app solicitará tu conformidad antes de continuar. Se mantienen tus derechos irrenunciables como consumidor y titular de datos.'],
];

export function LegalTermsContent({ onClose, closeLabel = 'Volver', onAccept }: { onClose?: () => void; closeLabel?: string; onAccept?: () => Promise<void> }) {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    if (!checked || !onAccept) return;
    setSaving(true);
    setError('');
    try { await onAccept(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la aceptación.'); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
    <View style={styles.header}>
      {onClose ? <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}><Text style={styles.back}>‹ {closeLabel}</Text></Pressable> : null}
      <Text style={styles.heading}>TÉRMINOS Y PRIVACIDAD</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.version}>Versión {LEGAL_VERSION}</Text>
      <Text style={styles.intro}>Lee estas condiciones antes de usar RankingUp.</Text>
      {sections.map(([title, body]) => <View key={title} style={styles.section}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>)}
      <View style={styles.section}>
        <Text style={styles.title}>Responsable y contacto</Text>
        <Text style={styles.body}>{appEnv.legalEntityName || 'Identidad legal del responsable pendiente de configurar.'}</Text>
        <Text style={styles.body}>{appEnv.legalContactEmail || 'Correo de contacto pendiente de configurar.'}</Text>
      </View>
      {onAccept ? <>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.checkRow} onPress={() => setChecked(!checked)}>
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}><Text style={styles.checkmark}>{checked ? '✓' : ''}</Text></View>
          <Text style={styles.checkText}>He leído y acepto los Términos y la información de privacidad de esta versión.</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" style={[styles.acceptButton, (!checked || saving) && styles.disabled]} disabled={!checked || saving} onPress={() => void accept()}>
          {saving ? <ActivityIndicator color="#182018" /> : <Text style={styles.acceptText}>ACEPTAR Y CONTINUAR</Text>}
        </Pressable>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

export default function LegalTermsScreen() {
  const navigation = useNavigation();
  return <LegalTermsContent onClose={() => navigation.goBack()} />;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  back: { color: theme.accent, fontSize: 15, marginBottom: 12, fontWeight: '700' },
  heading: { color: theme.text, fontSize: 18, fontWeight: '900' },
  content: { padding: 20, paddingBottom: 48 },
  version: { color: theme.accent, fontSize: 12, fontWeight: '800' },
  intro: { color: theme.text, fontSize: 16, marginTop: 8, marginBottom: 18 },
  section: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 16, borderRadius: 10, marginBottom: 12 },
  title: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  body: { color: theme.muted, fontSize: 13, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 14 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: theme.accent, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: theme.accentFill },
  checkmark: { color: '#182018', fontSize: 16, fontWeight: '900' },
  checkText: { color: theme.text, flex: 1, fontSize: 13, lineHeight: 19 },
  acceptButton: { backgroundColor: theme.accentFill, padding: 16, borderRadius: 8, alignItems: 'center' },
  acceptText: { color: '#182018', fontWeight: '900', fontSize: 13 },
  disabled: { opacity: 0.45 },
  error: { color: '#BD322B', marginBottom: 10 },
});
