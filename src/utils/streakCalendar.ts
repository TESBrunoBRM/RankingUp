export type StreakDay = { date: string; active: boolean };

/** Calendar dates are civil dates: UTC arithmetic prevents DST/local offset shifts. */
export function streakCalendarWeeks(days: StreakDay[]): Array<Array<StreakDay | null>> {
  if (!days.length) return [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(sorted.map(day => [day.date, day]));
  const start = new Date(`${sorted[0].date}T00:00:00Z`);
  const end = new Date(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return [];
  const cells: Array<StreakDay | null> = Array((start.getUTCDay() + 6) % 7).fill(null);
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    cells.push(byDate.get(cursor.toISOString().slice(0, 10)) ?? null);
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
