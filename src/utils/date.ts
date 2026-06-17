import type { WeekDay } from '../types';

const WEEK_DAYS: WeekDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentWeekDay = (date = new Date()): WeekDay => {
  return WEEK_DAYS[date.getDay()];
};
