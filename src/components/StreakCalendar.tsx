import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemePalette } from '../theme';
import { streakCalendarWeeks, type StreakDay } from '../utils/streakCalendar';

const format = (date: string) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export function StreakCalendar({ days }: { days: StreakDay[] }) {
  const theme = useThemePalette();
  const weeks = streakCalendarWeeks(days);
  const dates = days.map(day => day.date).sort();
  const today = dates[dates.length - 1];
  return <View style={{ gap: 12 }}>
    <Text style={{ color: theme.muted, lineHeight: 20 }}>Cada día que vuelves a RankingUp cuenta. Descansar también es parte del progreso.</Text>
    {dates.length ? <Text style={{ color: theme.text, fontWeight: '700' }}>{format(dates[0])} – {format(today)}</Text> : <Text style={{ color: theme.muted }}>Todavía no hay días registrados.</Text>}
    <View style={styles.week}>{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(label => <View key={label} style={styles.slot}><Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text></View>)}</View>
    {weeks.map((week, index) => <View key={index} style={styles.week}>{week.map((day, column) => <View key={day?.date ?? `empty-${column}`} style={styles.slot}>
      {day ? <View accessible accessibilityLabel={`${format(day.date)}${day.date === today ? ', hoy' : ''}: ${day.active ? 'visita registrada' : 'sin visita registrada'}`} style={[styles.day, { backgroundColor: day.active ? theme.accentFill : theme.surfaceAlt, borderColor: day.date === today ? theme.text : 'transparent', borderWidth: 2 }]}>
        <Text style={{ color: day.active ? '#182018' : theme.text, fontWeight: '800', fontSize: 13 }}>{Number(day.date.slice(-2))}</Text>
        <Text style={{ color: day.active ? '#182018' : theme.muted, fontSize: 9 }}>{day.active ? '✓' : '·'}</Text>
      </View> : null}
    </View>)}</View>)}
    <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>✓ Visita registrada · Borde: hoy{ '\n' }{days.filter(day => day.active).length} días registrados en este período.</Text>
  </View>;
}
const styles = StyleSheet.create({
  week: { flexDirection: 'row' }, slot: { width: `${100 / 7}%`, alignItems: 'center' },
  day: { width: '88%', minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
