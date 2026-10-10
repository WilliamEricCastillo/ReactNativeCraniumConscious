import {format, parseISO, isValid, addDays} from 'date-fns';

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');

export const isValidISODate = value =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));

export const formatLongDate = value =>
  isValidISODate(value) ? format(parseISO(value), 'MMMM dd, yyyy') : 'Unknown date';

export const formatWeekdayDate = value =>
  isValidISODate(value) ? format(parseISO(value), 'EEEE, MMM d') : 'Unknown date';

export const shiftISODate = (value, days) => format(addDays(parseISO(value), days), 'yyyy-MM-dd');

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};
