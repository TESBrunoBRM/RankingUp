import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { ProfilePage } from '../components/ProfilePage';
import { Button } from '../components/Button';
import { useThemePalette, useThemedStyles, type ThemePalette } from '../theme';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { restartWeightReminder, setWeightReminder, syncWeightReminder } from '../services/weightReminder';
import { useAuthStore } from '../store/authStore';
import type { WeightEntry, WeightReport } from '../types/weightReports';
import { getErrorMessage } from '../utils/errors';

const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('es-CL');
const kg = (value: number | null | undefined) => value == null ? 'Sin registrar' : `${Number(value).toLocaleString('es-CL', { maximumFractionDigits: 2 })} kg`;
const parseWeight = (value: string) => /^\d{2,3}([.,]\d{1,2})?$/.test(value.trim()) ? Number(value.trim().replace(',', '.')) : NaN;
const validWeight = (value: number) => Number.isFinite(value) && value >= 30 && value <= 300;

function WeightChart({ entries, target }: { entries: WeightEntry[]; target: number | null }) {
  const theme = useThemePalette();
  const ordered = [...entries].reverse();
  if (!ordered.length) return null;
  const values = ordered.map(item => Number(item.weight));
  const min = Math.min(...values, target ?? Infinity) - 1;
  const max = Math.max(...values, target ?? -Infinity) + 1;
  const first = Date.parse(ordered[0].measured_on);
  const span = Math.max(1, Date.parse(ordered[ordered.length - 1].measured_on) - first);
  const x = (entry: WeightEntry) => 18 + (Date.parse(entry.measured_on) - first) / span * 284;
  const y = (weight: number) => 145 - (weight - min) / (max - min) * 125;
  return <View accessible accessibilityLabel={`Gráfico de peso: ${kg(values[0])} a ${kg(values[values.length - 1])}. ${target !== null ? `Objetivo ${kg(target)}.` : ''}`}>
    <Svg viewBox="0 0 320 165" width="100%" height={165}>
      <Line x1={18} x2={302} y1={145} y2={145} stroke={theme.border} />
      {target !== null ? <Line x1={18} x2={302} y1={y(target)} y2={y(target)} stroke={theme.muted} strokeDasharray="5 5" /> : null}
      <Polyline points={ordered.map(entry => `${x(entry)},${y(Number(entry.weight))}`).join(' ')} stroke={theme.accent} strokeWidth={3} fill="none" />
      {ordered.map(entry => <Circle key={entry.measured_on} cx={x(entry)} cy={y(Number(entry.weight))} r={3} fill={theme.accent} />)}
    </Svg>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.muted, fontSize: 11 }}>{dateLabel(ordered[0].measured_on)}</Text>
      <Text style={{ color: theme.muted, fontSize: 11 }}>{dateLabel(ordered[ordered.length - 1].measured_on)}</Text>
    </View>
  </View>;
}

export default function ReportsScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore(state => state.session?.user.id);
  const [report, setReport] = useState<WeightReport | null>(null);
  const [weight, setWeight] = useState('');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reminder, setReminder] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [olderPage, setOlderPage] = useState(false);
  const requestVersion = useRef(0);
  const mutation = useRef(false);

  const load = useCallback(async (before?: string) => {
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const data = await rankingUpApiClient.getWeightReport(before);
      if (version !== requestVersion.current) return;
      setReport(data); setTarget(data.targetWeight?.toString() ?? ''); setOlderPage(Boolean(before));
    } catch (err) { if (version === requestVersion.current) setError(getErrorMessage(err, 'No se pudo cargar el informe.')); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void load();
    return () => { requestVersion.current++; };
  }, [load]));
  useEffect(() => {
    let active = true;
    const sync = () => {
      if (userId) void syncWeightReminder(userId).then(value => { if (active) setReminder(value); })
        .catch(() => { if (active) setError('No se pudo comprobar el recordatorio.'); });
    };
    sync();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { active = false; listener.remove(); };
  }, [userId]);

  const save = async (kind: 'weight' | 'target') => {
    if (mutation.current || !userId) return;
    const value = parseWeight(kind === 'weight' ? weight : target);
    const clear = kind === 'target' && !target.trim();
    if (!clear && !validWeight(value)) { setError('Ingresa un peso entre 30 y 300 kg, con hasta dos decimales.'); return; }
    mutation.current = true; setBusy(true); setError(''); setNotice(''); ++requestVersion.current;
    try {
      const data = kind === 'weight'
        ? await rankingUpApiClient.recordWeight(value, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
        : await rankingUpApiClient.setWeightTarget(clear ? null : value);
      setReport(data); setTarget(data.targetWeight?.toString() ?? ''); setOlderPage(false);
      if (kind === 'weight') {
        setWeight(''); setNotice('Peso guardado. Si ya registraste un peso hoy, se actualizó ese registro.');
        try { await restartWeightReminder(userId); }
        catch { setError('El peso se guardó, pero no se pudo reprogramar el recordatorio. Revisa el interruptor de notificaciones.'); }
      } else setNotice(clear ? 'Objetivo eliminado.' : 'Objetivo guardado.');
    } catch (err) { setError(getErrorMessage(err, 'No se pudo guardar.')); }
    finally { mutation.current = false; setBusy(false); setLoading(false); }
  };
  const toggleReminder = async (enabled: boolean) => {
    if (!userId || reminderBusy) return;
    setReminderBusy(true); setError('');
    try { setReminder(await setWeightReminder(userId, enabled)); }
    catch (err) { setError(getErrorMessage(err, 'No se pudo configurar el recordatorio.')); }
    finally { setReminderBusy(false); }
  };
  const latest = report?.latest;
  const gap = report?.currentWeight != null && report.targetWeight != null
    ? Math.round(Math.abs(report.currentWeight - report.targetWeight) * 100) / 100 : null;
  return <ProfilePage title="Informes" loading={loading} error={error} onRetry={() => void load()}>
    <View style={styles.heading}><Ionicons name="analytics-outline" size={23} color={theme.accent} /><Text style={styles.title}>Tu evolución de peso</Text></View>
    <Text style={styles.body}>Un registro semanal para observar tu tendencia, a tu ritmo.</Text>
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.label}>PESO ACTUAL</Text><Text style={styles.current}>{kg(report?.currentWeight)}</Text>
      <Text style={styles.body}>{latest ? `Último registro: ${dateLabel(latest.measured_on)}` : 'Registra tu primera medición para comenzar el historial.'}</Text>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.label}>OBJETIVO</Text><Text style={styles.value}>{kg(report?.targetWeight)}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>VARIACIÓN SEMANAL</Text><Text style={styles.value}>{report?.weeklyChange != null ? `${report.weeklyChange > 0 ? '+' : ''}${kg(report.weeklyChange)}` : 'Sin comparación'}</Text></View>
      </View>
      {report?.comparisonDate ? <Text style={styles.body}>Comparación del último registro con el {dateLabel(report.comparisonDate)}.</Text> : <Text style={styles.body}>La variación necesita una medición de entre 7 y 14 días antes del último registro.</Text>}
      {gap !== null ? <Text style={styles.notice}>{gap === 0 ? 'Tu peso actual coincide con tu objetivo.' : `Diferencia con tu objetivo: ${kg(gap)}`}</Text> : null}
      {report?.targetCalories != null ? <><Text style={styles.label}>ESTIMACIÓN CALÓRICA DIARIA</Text><Text style={styles.value}>{report.targetCalories.toLocaleString('es-CL')} kcal</Text><Text style={styles.body}>Se recalcula con cada nuevo peso, manteniendo tu objetivo nutricional.</Text></> : <Text style={styles.body}>Si completas tus datos nutricionales, la estimación calórica se recalculará al registrar tu peso.</Text>}
    </View>
    <View style={styles.card}>
      <Text style={styles.title}>Registrar peso de hoy</Text>
      <Text style={styles.body}>Kilogramos · un registro por día</Text>
      <TextInput accessibilityLabel="Peso de hoy en kilogramos" placeholder="Ej. 75,4" placeholderTextColor={theme.muted} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} editable={!busy} maxLength={6} style={styles.input} />
      <Button title="Guardar peso" loading={busy} disabled={!report || !weight.trim()} onPress={() => void save('weight')} />
      <Text style={styles.label}>PESO OBJETIVO (KG)</Text>
      <TextInput accessibilityLabel="Peso objetivo en kilogramos" placeholder="Opcional" placeholderTextColor={theme.muted} keyboardType="decimal-pad" value={target} onChangeText={setTarget} editable={!busy} maxLength={6} style={styles.input} />
      <Button title={target.trim() ? 'Guardar objetivo' : 'Quitar objetivo'} variant="outline" disabled={busy || !report || (!target.trim() && report.targetWeight === null)} onPress={() => void save('target')} />
    </View>
    <View style={styles.card}>
      <View style={styles.metrics}><View style={styles.metric}><Text style={styles.title}>Recordatorio semanal</Text><Text style={styles.body}>Cada 7 días desde la activación o tu último registro en Informes. Solo en este dispositivo.</Text></View>
        <Switch accessibilityLabel="Recordatorio semanal para registrar peso" value={reminder} disabled={reminderBusy || Platform.OS === 'web'} onValueChange={value => void toggleReminder(value)} trackColor={{ false: theme.border, true: theme.accent }} />
      </View>
      <Text style={styles.body}>{Platform.OS === 'web' ? 'Disponible en la app para Android e iOS.' : reminder ? 'Activado. Puedes desactivarlo cuando quieras.' : 'Desactivado. Al activarlo se solicitará permiso para notificaciones.'}</Text>
      {Platform.OS !== 'web' ? <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => setError('No se pudieron abrir los ajustes.'))}><Text style={styles.link}>Abrir ajustes de notificaciones</Text></Pressable> : null}
    </View>
    <View style={styles.card}>
      <Text style={styles.title}>Historial de peso</Text>
      {report?.items.length ? <>
        <WeightChart entries={report.items} target={report.targetWeight} />
        <Text style={styles.body}>{report.targetWeight !== null ? `Línea discontinua: objetivo de ${kg(report.targetWeight)}.` : 'Cada punto representa una medición.'}</Text>
        {report.items.map(entry => <View key={entry.measured_on} style={styles.historyRow}><Text style={styles.body}>{dateLabel(entry.measured_on)}</Text><Text style={styles.value}>{kg(entry.weight)}</Text></View>)}
        {report.nextCursor ? <Button title="Ver registros anteriores" variant="outline" disabled={busy} onPress={() => void load(report.nextCursor!)} /> : null}
        {olderPage ? <Button title="Volver a los más recientes" variant="outline" disabled={busy} onPress={() => void load()} /> : null}
      </> : <Text style={styles.body}>Aún no hay mediciones guardadas.</Text>}
      <Text style={styles.body}>El historial de peso se conserva para ver tu evolución. El historial de entrenamientos y sus publicaciones se elimina al superar los 14 días.</Text>
    </View>
    <View style={styles.card}><Text style={styles.label}>PRÓXIMAMENTE</Text><Text style={styles.body}>Informes avanzados, personalización Pro y planes de profesionales. Aún no están incluidos en el plan disponible.</Text></View>
  </ProfilePage>;
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { color: theme.text, fontSize: 18, fontWeight: '800' },
  body: { color: theme.muted, fontSize: 13, lineHeight: 20 }, label: { color: theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 18, gap: 12 },
  current: { color: theme.text, fontSize: 38, fontWeight: '900' }, value: { color: theme.text, fontSize: 15, fontWeight: '700' },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 12 }, metric: { flex: 1, gap: 7 },
  input: { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, padding: 14, fontSize: 18 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border, paddingVertical: 8 },
  notice: { color: theme.accent, fontSize: 13, lineHeight: 20 }, link: { color: theme.accent, fontSize: 13, fontWeight: '700', paddingVertical: 10 },
});
