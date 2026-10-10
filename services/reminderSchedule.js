// Pure scheduling rules for reminders (no Expo imports, so they can be unit tested).

const COPY = {
  'check-in': {title: 'Time for a check-in', body: 'How are you feeling right now?'},
  journal: {title: 'Evening journal', body: 'Take a minute to write about your day.'},
  'weekly-review': {title: 'Weekly review', body: 'Look back at your week in Insights.'},
};

export const contentFor = reminder => COPY[reminder.kind] || {title: reminder.label, body: 'Tap to open Cranium Conscious.'};

export const parseTime = time => {
  const [hour, minute] = time.split(':').map(Number);
  return {hour, minute};
};

// Identifiers look like "<reminderId>__daily" or "<reminderId>__<weekday 0-6>" so one reminder can own several triggers.
export const triggerId = (reminderId, part) => `${reminderId}__${part}`;
export const reminderIdOf = identifier => String(identifier).split('__')[0];

// Every day selected -> one daily trigger; otherwise one weekly trigger per chosen day (Expo weekdays: Sunday = 1).
export const buildTriggers = reminder => {
  const {hour, minute} = parseTime(reminder.time);
  const days = [...new Set(reminder.daysOfWeek)].sort();
  if (days.length === 7) return [{id: triggerId(reminder.id, 'daily'), trigger: {hour, minute, repeats: true}}];
  return days.map(day => ({id: triggerId(reminder.id, day), trigger: {weekday: day + 1, hour, minute, repeats: true}}));
};

export const formatTime = time => {
  const {hour, minute} = parseTime(time);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const describeDays = days => {
  const set = [...new Set(days)].sort();
  if (set.length === 7) return 'Every day';
  return set.map(d => NAMES[d]).join(', ');
};
