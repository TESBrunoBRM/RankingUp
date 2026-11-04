import assert from 'node:assert/strict';
import { test } from 'node:test';
import { streakCalendarWeeks } from '../src/utils/streakCalendar.ts';
import { catalogExerciseName, EXERCISE_CATALOG_ALIASES } from '../src/constants/exerciseAliases.ts';
import { readFileSync } from 'node:fs';

test('calendar starts Monday, preserves civil dates across month and DST boundaries', () => {
  const days = ['2026-10-31', '2026-11-01', '2026-11-02'].map(date => ({ date, active: date.endsWith('01') }));
  const weeks = streakCalendarWeeks(days.reverse());
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0][5]?.date, '2026-10-31');
  assert.equal(weeks[0][6]?.active, true);
  assert.equal(weeks[1][0]?.date, '2026-11-02');
  assert.equal(weeks[0].length, 7);
  assert.equal(weeks[1][1], null);
});
test('calendar handles empty data and gaps without inventing activity', () => {
  assert.deepEqual(streakCalendarWeeks([]), []);
  const weeks = streakCalendarWeeks([{ date: '2024-02-28', active: true }, { date: '2024-03-01', active: false }]);
  assert.equal(weeks[0][2]?.date, '2024-02-28');
  assert.equal(weeks[0][3], null);
  assert.equal(weeks[0][4]?.active, false);
});
test('every curated alias exists uniquely in the real catalog with GIF and thumbnail', () => {
  const dataset = JSON.parse(readFileSync(new URL('../apps/api/data/exercises.es-en.json', import.meta.url), 'utf8')) as Array<{name:string; gif:string; image:string}>;
  for (const name of Object.values(EXERCISE_CATALOG_ALIASES)) {
    const matches = dataset.filter(exercise => exercise.name === name);
    assert.equal(matches.length, 1, name);
    assert.ok(matches[0].gif && matches[0].image, name);
  }
  assert.equal(catalogExerciseName('  Extensión de Tríceps en Polea  '), 'cable pushdown (with rope attachment)');
  assert.equal(catalogExerciseName('Plancha'), 'Plancha');
  assert.equal(catalogExerciseName('Mi ejercicio personal'), 'Mi ejercicio personal');
});
