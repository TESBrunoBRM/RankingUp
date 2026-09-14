import { BadRequestException } from '@nestjs/common';

export const getLocalDate = (timeZone: string, now = new Date()): string => {
  if (!timeZone || timeZone.length > 80) {
    throw new BadRequestException('Zona horaria no valida.');
  }
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
  } catch {
    throw new BadRequestException('Zona horaria no valida.');
  }
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getVisibleStreak = (current: number | null | undefined, lastDate: string | null | undefined, today: string): number => {
  if (!lastDate || !current) return 0;
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return lastDate === today || lastDate === yesterday.toISOString().slice(0, 10) ? current : 0;
};

export const getRecentDates = (today: string, count = 35): string[] => {
  const date = new Date(`${today}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() - (count - index - 1));
    return day.toISOString().slice(0, 10);
  });
};
