import {buildTriggers, contentFor, reminderIdOf, formatTime, describeDays} from '../reminderSchedule';
import {formatWater, describeCustomEntries} from '../../src/utils/format';

const reminder = (overrides = {}) => ({id: 'reminder_abc', label: 'Test', kind: 'check-in', time: '09:05', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], ...overrides});

describe('reminder triggers', () => {
  test('every day becomes a single repeating daily trigger', () => {
    expect(buildTriggers(reminder())).toEqual([{id: 'reminder_abc__daily', trigger: {hour: 9, minute: 5, repeats: true}}]);
  });

  test('chosen days become weekly triggers using Expo weekdays (Sunday = 1)', () => {
    const triggers = buildTriggers(reminder({time: '18:00', daysOfWeek: [0, 3]}));
    expect(triggers).toEqual([
      {id: 'reminder_abc__0', trigger: {weekday: 1, hour: 18, minute: 0, repeats: true}},
      {id: 'reminder_abc__3', trigger: {weekday: 4, hour: 18, minute: 0, repeats: true}},
    ]);
  });

  test('identifiers map back to their reminder', () => {
    expect(reminderIdOf('reminder_abc__3')).toBe('reminder_abc');
    expect(reminderIdOf('reminder_abc__daily')).toBe('reminder_abc');
  });

  test('copy depends on the reminder kind', () => {
    expect(contentFor(reminder({kind: 'journal'})).title).toBe('Evening journal');
    expect(contentFor(reminder({kind: 'custom', label: 'Stretch'})).title).toBe('Stretch');
  });
});

describe('formatting', () => {
  test('times and days read naturally', () => {
    expect(formatTime('00:30')).toBe('12:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('20:30')).toBe('8:30 PM');
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(describeDays([0])).toBe('Sunday');
  });

  test('water converts for display only', () => {
    expect(formatWater(null)).toBe('Not logged');
    expect(formatWater(1)).toBe('1 glass');
    expect(formatWater(3)).toBe('3 glasses');
    expect(formatWater(4, 'ml')).toBe('1000 ml');
    expect(formatWater(4, 'oz')).toBe('34 oz');
  });

  test('custom metric summaries respect the metric type', () => {
    const entries = value => [{value}];
    expect(describeCustomEntries({valueType: 'number', unit: 'min'}, [])).toBe('Not logged');
    expect(describeCustomEntries({valueType: 'number', unit: 'min'}, entries(10))).toBe('10 min');
    expect(describeCustomEntries({valueType: 'scale'}, entries(4))).toBe('4 / 5');
    expect(describeCustomEntries({valueType: 'boolean'}, entries(1))).toBe('Yes');
    expect(describeCustomEntries({valueType: 'number', unit: ''}, [{value: 1}, {value: 2}])).toBe('2 (2 logs)');
  });
});
