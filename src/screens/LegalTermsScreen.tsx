import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { appEnv } from '../config/env';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';

import { LEGAL_VERSION } from '../constants/legal';
export { LEGAL_VERSION } from '../constants/legal';

const sections = [
  ['Uso y funciones elegidas', 'RankingUp ofrece herramientas de registro de ejercicios, alimentación y actividad social. Al comenzar eliges las funciones que quieres ver y revisas una guía y los avisos correspondientes. Puedes cambiar la selección y repetir el recorrido en Perfil → Mis funciones y guía. Desactivar una función no borra tus registros ni convierte las funciones activas en servicios médicos. Debes usar la app lícitamente y respetar a otras personas. Podemos moderar aportes y suspender usos abusivos conforme a la ley aplicable.'],
  ['Información que proporcionas', 'Eres responsable de entregar datos veraces, completos y actualizados, incluidos edad, peso, estatura, actividad, cantidades y alimentos registrados, y de corregir errores que detectes. No inventes ni omitas información relevante al usar una estimación. Los datos falsos, inexactos, incompletos o desactualizados pueden producir resultados inadecuados y aumentar el riesgo de daño. En la medida permitida por la ley, te corresponden las consecuencias atribuibles a esa información y a ignorar advertencias o indicaciones profesionales. Esto no traslada al usuario la responsabilidad por fallas de RankingUp ni limita derechos irrenunciables.'],
  ['Alcance de la información de salud', 'Los ejercicios, planes automáticos, metas de calorías, macronutrientes, hidratación y estimaciones de fuerza son orientativos. No constituyen diagnóstico, tratamiento, prescripción médica, rehabilitación ni una dieta clínica. La app no evalúa tu aptitud para ejercitarte, no supervisa la técnica en tiempo real ni conoce todas tus circunstancias de salud. No garantiza mejorías, pérdida de peso, rendimiento ni ausencia de lesiones o enfermedades.'],
  ['Ejercicio y prevención de lesiones', 'Toda actividad física puede causar lesiones, caídas, sobrecarga o agravamiento de condiciones previas. Elige ejercicios, intensidad y cargas acordes con tu capacidad, revisa las instrucciones, usa equipo y espacio adecuados y comienza gradualmente. Si tienes lesiones, enfermedades, embarazo, limitaciones de movilidad o dudas, consulta a un profesional antes de seguir una rutina. Si eres una persona mayor o retomas actividad después de un periodo prolongado, pide orientación para adaptar el ejercicio a tu situación. Detente ante dolor, mareos o falta de aire inusual. Ante dolor en el pecho, desmayo o dificultad respiratoria intensa, busca atención urgente. No continúes para mantener una racha, ganar puntos o completar un reto.'],
  ['Alimentación y riesgos de las estimaciones', 'Los cálculos no determinan tus necesidades clínicas. Consulta a un profesional antes de cambiar tu alimentación si tienes una condición médica, embarazo, lactancia, restricciones de líquidos o antecedentes de trastornos alimentarios. No apliques metas calóricas a menores sin orientación profesional. No cambies medicación ni tratamientos siguiendo la app. La foto de un plato no permite conocer con certeza ingredientes, alérgenos, peso, cocción o porción. Revisa y corrige los resultados antes de usarlos. No utilices el escáner ni el catálogo para decidir si un alimento es seguro para una alergia. Las metas de agua también son orientativas y deben ajustarse a las indicaciones profesionales.'],
  ['Responsabilidad y derechos del usuario', 'Cada persona decide cómo utilizar la información y debe respetar sus límites y las indicaciones de sus profesionales de salud. La aceptación de estos términos reconoce los riesgos descritos y el deber de aportar datos correctos; no es una certificación de aptitud física ni una renuncia a reclamar por lesiones, enfermedad, defectos del servicio o incumplimientos legales. RankingUp mantiene las obligaciones y responsabilidades que le correspondan conforme a la ley. Ninguna cláusula excluye de forma absoluta su responsabilidad ni impide acudir a autoridades, tribunales u organismos de protección al consumidor.'],
  ['Fotos e inteligencia artificial', 'Cuando eliges analizar una foto, la imagen se sube a un almacenamiento privado y se envía al proveedor de IA configurado para identificar alimentos y estimar nutrientes. Evita incluir rostros, documentos u otros datos ajenos. Puedes registrar alimentos sin usar la cámara. Los resultados pueden ser incorrectos y no garantizamos una identificación perfecta.'],
  ['Aportes al catálogo', 'Si envías un alimento, autorizas a RankingUp a revisar su foto y datos y a mostrar el nombre y valores nutricionales aprobados a otros usuarios. Garantizas que puedes compartir el contenido. Un administrador puede corregir, rechazar o retirar aportes. Las estimaciones de IA no se publican automáticamente como datos verificados.'],
  ['Datos y privacidad', 'Tratamos los datos de cuenta, perfil, entrenamiento, nutrición y fotos para operar la app, mantener seguridad y atender solicitudes. Guardamos las funciones elegidas, la versión de los avisos revisados, la fecha de su confirmación y de finalización de la guía, y el historial de estas confirmaciones. Esta configuración no requiere que declares diagnósticos médicos. Ocultar Comunidad no modifica automáticamente la visibilidad de un perfil público o de publicaciones anteriores: revísala en tu perfil. El perfil público y las interacciones sociales son visibles según la configuración elegida. Usamos proveedores de autenticación, almacenamiento y análisis de imágenes que pueden procesar datos bajo sus propias condiciones. Conservamos los datos mientras la cuenta esté activa o por los plazos exigidos por ley. Puedes solicitar acceso, rectificación o eliminación mediante el contacto indicado abajo, sujeto a las excepciones legales.'],
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
      <Text style={styles.intro}>Lee estas condiciones antes de usar RankingUp. La información es orientativa: tu seguridad y las indicaciones de tus profesionales tienen prioridad.</Text>
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
  title: { color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  body: { color: theme.muted, fontSize: 16, lineHeight: 25 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 14 },
  checkbox: { width: 32, height: 32, borderWidth: 2, borderColor: theme.accent, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: theme.accentFill },
  checkmark: { color: '#182018', fontSize: 16, fontWeight: '900' },
  checkText: { color: theme.text, flex: 1, fontSize: 16, lineHeight: 24 },
  acceptButton: { backgroundColor: theme.accentFill, padding: 16, borderRadius: 8, alignItems: 'center' },
  acceptText: { color: '#182018', fontWeight: '900', fontSize: 13 },
  disabled: { opacity: 0.45 },
  error: { color: '#BD322B', marginBottom: 10 },
});
