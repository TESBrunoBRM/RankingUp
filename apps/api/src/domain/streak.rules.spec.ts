import { BadRequestException } from '@nestjs/common';
import { getLocalDate, getRecentDates, getVisibleStreak } from './streak.rules';

describe('streak rules', () => {
  it('uses the server clock in the selected IANA timezone', () => {
    expect(getLocalDate('America/Santiago', new Date('2026-09-14T02:00:00Z'))).toBe('2026-09-13');
    expect(getLocalDate('Europe/Madrid', new Date('2026-09-14T02:00:00Z'))).toBe('2026-09-14');
  });

  it('rejects invented zones', () => {
    expect(() => getLocalDate('Mars/Olympus')).toThrow(BadRequestException);
  });

  it('hides a broken current streak without erasing the longest', () => {
    expect(getVisibleStreak(4, '2026-09-12', '2026-09-14')).toBe(0);
    expect(getVisibleStreak(4, '2026-09-13', '2026-09-14')).toBe(4);
  });

  it('returns 35 ordered calendar dates', () => {
    const days = getRecentDates('2026-09-14');
    expect(days).toHaveLength(35);
    expect(days.at(-1)).toBe('2026-09-14');
  });
});
