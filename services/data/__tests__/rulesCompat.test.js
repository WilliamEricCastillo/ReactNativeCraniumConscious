// Guards against the app and firestore.rules drifting apart: every field a saved record carries must be allowed by the rules.
const fs = require('fs');
const path = require('path');

const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async key => (mockStorage.has(key) ? mockStorage.get(key) : null),
    setItem: async (key, value) => void mockStorage.set(key, String(value)),
    removeItem: async key => void mockStorage.delete(key),
    getAllKeys: async () => [...mockStorage.keys()],
    multiGet: async keys => keys.map(key => [key, mockStorage.has(key) ? mockStorage.get(key) : null]),
    multiSet: async pairs => pairs.forEach(([key, value]) => mockStorage.set(key, String(value))),
  },
}));

const rules = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8');
const listFrom = text => [...text.matchAll(/'([A-Za-z]+)'/g)].map(m => m[1]);
const common = listFrom(/function common\(\) \{\s*return \[([^\]]*)\]/.exec(rules)[1]);
const allowed = fn => [...common, ...listFrom(new RegExp(`function ${fn}\\(d\\) \\{\\s*return d\\.keys\\(\\)\\.hasOnly\\(common\\(\\)\\.concat\\(\\[([^\\]]*)\\]\\)\\)`).exec(rules)[1])];

const DAY = '2026-01-05';
const CLOUD_ADDED = ['deleted', 'deviceId', 'serverUpdatedAt'];

test('records written by the app only use fields the rules allow', async () => {
  const ds = require('../dataService');
  const store = require('../localStore');

  const metric = await ds.createCustomMetric({name: 'Reading', unit: 'pages'});
  await ds.createJournalEntry({date: DAY, time: '09:00 AM', moodValue: 4, journal: 'x', prompt: 'A prompt'});
  await ds.saveDailyCheckIn({date: DAY, mood: 4, stress: 2});
  await ds.saveMetricEntry({metricId: 'meal', date: DAY, value: 1, label: 'Oats', category: 'breakfast'});
  await ds.saveMetricEntry({metricId: metric.id, date: DAY, value: 12});
  await ds.setGoalByTitle('Sleep 7+ hours', true);
  await ds.createGoal({title: 'Read daily', target: {value: 10, unit: 'pages', period: 'day'}});
  await ds.setReminderPreset({label: 'Morning check-in', kind: 'check-in', time: '09:00'}, true);
  await ds.updatePreferences({units: {water: 'ml'}});
  await ds.updateUserProfile({displayName: 'Alice'});

  const byCollection = {
    journalEntries: 'validJournal',
    dailyCheckIns: 'validCheckIn',
    customMetrics: 'validCustomMetric',
    metricEntries: 'validMetricEntry',
    goals: 'validGoal',
    reminders: 'validReminder',
    settings: 'validSettings',
    profile: 'validProfile',
  };

  for (const [collection, fn] of Object.entries(byCollection)) {
    const records = await store.listRecords(collection);
    expect(records.length).toBeGreaterThan(0);
    const ok = new Set(allowed(fn));
    records.forEach(record => {
      const unexpected = Object.keys(record).filter(k => !ok.has(k));
      expect({collection, unexpected}).toEqual({collection, unexpected: []});
    });
  }
  expect(CLOUD_ADDED.every(k => common.includes(k))).toBe(true);
});
