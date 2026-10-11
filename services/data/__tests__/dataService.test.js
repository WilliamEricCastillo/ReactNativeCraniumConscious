// Persistence tests for the local data layer. The in-memory storage below survives jest.resetModules(), so
// reloading the modules simulates closing and reopening the app.
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

const DAY = '2026-01-05';
const PREFIX = '@cranium-conscious/v3/';

// Fresh module instances over the same storage = an app restart.
const openApp = () => {
  jest.resetModules();
  return {
    ds: require('../dataService'),
    store: require('../localStore'),
    models: require('../models'),
  };
};

beforeEach(() => mockStorage.clear());

describe('journal entries', () => {
  test('create, read, list by date and survive a restart', async () => {
    let {ds} = openApp();
    const entry = await ds.createJournalEntry({date: DAY, time: '09:00 AM', moodValue: 4, journal: 'Good day'});
    await ds.createJournalEntry({date: '2026-01-06', moodValue: 2, journal: 'Other day'});

    ({ds} = openApp());
    expect(await ds.getJournalEntry(entry.id)).toMatchObject({journal: 'Good day', moodValue: 4, rev: 1, source: 'app'});
    expect((await ds.listJournalEntries({date: DAY})).map(e => e.journal)).toEqual(['Good day']);
    expect(await ds.listJournalEntries()).toHaveLength(2);
  });

  test('update changes text and mood, bumps rev and keeps date and createdAt', async () => {
    const {ds} = openApp();
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'First'});
    const updated = await ds.updateJournalEntry(entry.id, {journal: 'Second', moodValue: 5, date: '2030-01-01'});
    expect(updated).toMatchObject({journal: 'Second', moodValue: 5, date: DAY, rev: 2, createdAt: entry.createdAt});
  });

  test('invalid input is rejected and nothing is stored', async () => {
    const {ds, models} = openApp();
    const bad = [
      {date: DAY, moodValue: 6, journal: 'x'},
      {date: DAY, moodValue: 3, journal: '   '},
      {date: '2026-13-40', moodValue: 3, journal: 'x'},
      {date: DAY, moodValue: 3, journal: 'x'.repeat(models.MAX_JOURNAL_LENGTH + 1)},
    ];
    for (const input of bad) await expect(ds.createJournalEntry(input)).rejects.toBeInstanceOf(models.DataValidationError);
    expect(await ds.listJournalEntries()).toHaveLength(0);
  });

  test('delete removes the entry', async () => {
    const {ds} = openApp();
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'Bye'});
    await ds.deleteJournalEntry(entry.id);
    expect(await ds.getJournalEntry(entry.id)).toBeNull();
  });

  test('drafts persist, are device-only and clear', async () => {
    let {ds, store} = openApp();
    const id = ds.journalDraftId({date: DAY});
    await ds.saveJournalDraft(id, {journal: 'half written', moodValue: 2});
    ({ds, store} = openApp());
    expect(await ds.getJournalDraft(id)).toMatchObject({journal: 'half written', moodValue: 2});
    expect(await store.listOutboxOps()).toHaveLength(0);
    await ds.clearJournalDraft(id);
    expect(await ds.getJournalDraft(id)).toBeNull();
  });
});

describe('check-ins and mood', () => {
  test('values merge per field and null clears', async () => {
    const {ds} = openApp();
    await ds.saveDailyCheckIn({date: DAY, mood: 4});
    await ds.saveDailyCheckIn({date: DAY, energy: 2});
    expect(await ds.getDailyCheckIn(DAY)).toMatchObject({mood: 4, energy: 2, stress: null, focus: null, rev: 2});
    await ds.saveDailyCheckIn({date: DAY, mood: null});
    expect((await ds.getDailyCheckIn(DAY)).mood).toBeNull();
    expect(await ds.listDailyCheckIns()).toHaveLength(1);
  });

  test('rejects empty and out-of-range values', async () => {
    const {ds, models} = openApp();
    await expect(ds.saveDailyCheckIn({date: DAY})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveDailyCheckIn({date: DAY, mood: 6})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveDailyCheckIn({date: DAY, focus: 2.5})).rejects.toBeInstanceOf(models.DataValidationError);
    expect(await ds.getDailyCheckIn(DAY)).toBeNull();
  });

  test('supports marked 1-10 ratings while preserving untouched legacy raw values', async () => {
    const {ds} = openApp();
    await ds.saveDailyCheckIn({date: DAY, mood: 4, energy: 2, stress: 4, focus: 3});
    await ds.saveDailyCheckIn({date: DAY, energy: 9, ratingScales: {energy: 'scale_1_10'}});

    const stored = await ds.getDailyCheckIn(DAY);
    expect(stored).toMatchObject({
      mood: 4,
      energy: 9,
      stress: 4,
      focus: 3,
      scale: 'scale_1_5',
      ratingScales: {energy: 'scale_1_10'},
    });
    expect(await ds.getMetricSeries({metricId: 'energy'})).toEqual([{date: DAY, value: 9, unit: 'scale_1_10'}]);
    expect(await ds.getMetricSeries({metricId: 'stress'})).toEqual([{date: DAY, value: 7.75, unit: 'scale_1_10'}]);
  });

  test('requires an explicit scale marker for 1-10 values and accepts only integer bounds', async () => {
    const {ds, models} = openApp();
    await expect(ds.saveDailyCheckIn({date: DAY, energy: 6})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveDailyCheckIn({date: DAY, energy: 0, ratingScales: {energy: 'scale_1_10'}})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveDailyCheckIn({date: DAY, energy: 11, ratingScales: {energy: 'scale_1_10'}})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveDailyCheckIn({date: DAY, energy: 2.5, ratingScales: {energy: 'scale_1_10'}})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveDailyCheckIn({date: DAY, mood: 6, ratingScales: {energy: 'scale_1_10'}})).rejects.toBeInstanceOf(models.DataValidationError);
  });

  test('mood saved through the metric API lands on the check-in only', async () => {
    const {ds} = openApp();
    await ds.saveMetricEntry({metricId: 'mood', date: DAY, value: 4});
    expect((await ds.getDailyCheckIn(DAY)).mood).toBe(4);
    expect(await ds.listMetricEntries()).toHaveLength(0);
    expect(await ds.getMetricSeries({metricId: 'mood'})).toEqual([{date: DAY, value: 4, unit: 'scale_1_5'}]);
  });
});

describe('journal editor combined saves', () => {
  test('saves journal, check-in, daily metrics and meals together without duplicate daily records', async () => {
    const {ds} = openApp();
    await ds.saveMetricEntry({metricId: 'water', date: DAY, value: 2});
    const result = await ds.saveJournalAndTracking({
      journal: {date: DAY, time: '09:00 AM', moodValue: 4, journal: 'A combined entry'},
      checkIn: {date: DAY, energy: 8, ratingScales: {energy: 'scale_1_10'}},
      metrics: [
        {metricId: 'water', date: DAY, value: 5},
        {metricId: 'sleep', date: DAY, value: 7.5},
        {metricId: 'meal', date: DAY, value: 1, label: 'Oatmeal', category: 'breakfast'},
        {metricId: 'meal', date: DAY, value: 1, label: 'Soup', category: 'lunch'},
      ],
    });

    expect(result.journal).toMatchObject({journal: 'A combined entry', moodValue: 4});
    expect(await ds.listJournalEntries({date: DAY})).toHaveLength(1);
    expect((await ds.getDailyCheckIn(DAY))).toMatchObject({energy: 8, ratingScales: {energy: 'scale_1_10'}});
    expect(await ds.listMetricEntries({date: DAY, metricId: 'water'})).toHaveLength(1);
    expect((await ds.getDaySnapshot(DAY)).waterGlasses).toBe(5);
    expect((await ds.getDaySnapshot(DAY)).meals.map(item => item.label)).toEqual(['Oatmeal', 'Soup']);
  });

  test('supports a stats-only save without creating an empty journal entry', async () => {
    const {ds} = openApp();
    await ds.saveJournalAndTracking({
      checkIn: {date: DAY, focus: 6, ratingScales: {focus: 'scale_1_10'}},
      metrics: [{metricId: 'water', date: DAY, value: 3}],
    });
    expect(await ds.listJournalEntries()).toHaveLength(0);
    expect(await ds.getDailyCheckIn(DAY)).toMatchObject({focus: 6});
    expect((await ds.getDaySnapshot(DAY)).waterGlasses).toBe(3);
  });
  test('journal-only save keeps journal mood separate from daily check-in mood', async () => {
    const {ds} = openApp();
    await ds.saveJournalAndTracking({
      journal: {date: DAY, time: '09:00 AM', moodValue: 4, journal: 'Journal only'},
    });
    expect(await ds.listJournalEntries({date: DAY})).toHaveLength(1);
    expect(await ds.getDailyCheckIn(DAY)).toBeNull();
  });
});

describe('metrics', () => {
  test('sleep, exercise and water keep one record per day', async () => {
    let {ds} = openApp();
    await ds.saveMetricEntry({metricId: 'water', date: DAY, value: 3});
    await ds.saveMetricEntry({metricId: 'water', date: DAY, value: 5});
    await ds.saveMetricEntry({metricId: 'sleep', date: DAY, value: 7.5});
    await ds.saveMetricEntry({metricId: 'exercise', date: DAY, value: 30, category: 'run'});
    ({ds} = openApp());
    expect(await ds.listMetricEntries({metricId: 'water'})).toHaveLength(1);
    expect(await ds.getDaySnapshot(DAY)).toMatchObject({
      waterGlasses: 5,
      sleepHours: 7.5,
      exerciseMinutes: 30,
      exerciseCategory: 'run',
    });
  });

  test('meals append', async () => {
    const {ds} = openApp();
    await ds.saveMetricEntry({metricId: 'meal', date: DAY, value: 1, label: 'Oats', category: 'breakfast'});
    await ds.saveMetricEntry({metricId: 'meal', date: DAY, value: 1, label: 'Soup', category: 'lunch'});
    expect((await ds.getDaySnapshot(DAY)).meals.map(m => m.label)).toEqual(['Oats', 'Soup']);
  });

  test('out-of-range and unknown metrics are rejected', async () => {
    const {ds, models} = openApp();
    await expect(ds.saveMetricEntry({metricId: 'sleep', date: DAY, value: 25})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveMetricEntry({metricId: 'water', date: DAY, value: -1})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.saveMetricEntry({metricId: 'nope', date: DAY, value: 1})).rejects.toBeInstanceOf(models.DataNotFoundError);
    expect(await ds.listMetricEntries()).toHaveLength(0);
  });

  test('getMetricSeries filters by date range', async () => {
    const {ds} = openApp();
    for (const [date, value] of [['2026-01-01', 6], ['2026-01-05', 7], ['2026-01-09', 8]]) {
      await ds.saveMetricEntry({metricId: 'sleep', date, value});
    }
    const series = await ds.getMetricSeries({metricId: 'sleep', from: '2026-01-02', to: '2026-01-09'});
    expect(series.map(p => p.value)).toEqual([7, 8]);
  });
});

describe('custom metrics', () => {
  test('logging by name creates once and reuses case-insensitively', async () => {
    const {ds} = openApp();
    await ds.logCustomMetricValue({name: 'Meditation', unit: 'minutes', value: 10, date: DAY});
    await ds.logCustomMetricValue({name: ' meditation ', value: 5, date: DAY});
    expect(await ds.listCustomMetrics()).toHaveLength(1);
    const snapshot = await ds.getDaySnapshot(DAY);
    expect(snapshot.customEntries.map(e => e.value)).toEqual([10, 5]);
    expect(Object.values(snapshot.customMetricNames)).toEqual(['Meditation']);
  });

  test('new metrics are tracked, duplicate names are rejected', async () => {
    const {ds, models} = openApp();
    const metric = await ds.createCustomMetric({name: 'Reading', unit: 'pages'});
    expect((await ds.getPreferences()).trackedMetricIds).toContain(metric.id);
    await expect(ds.createCustomMetric({name: 'READING'})).rejects.toBeInstanceOf(models.DataValidationError);
  });

  test('archiving hides the metric, untracks it and keeps its entries', async () => {
    const {ds, models} = openApp();
    const metric = await ds.createCustomMetric({name: 'Walks', unit: 'km'});
    await ds.saveMetricEntry({metricId: metric.id, date: DAY, value: 2});
    await ds.archiveCustomMetric(metric.id);
    expect(await ds.listCustomMetrics()).toHaveLength(0);
    expect(await ds.listCustomMetrics({includeArchived: true})).toHaveLength(1);
    expect(await ds.listMetricEntries({metricId: metric.id})).toHaveLength(1);
    expect((await ds.getPreferences()).trackedMetricIds).not.toContain(metric.id);
    await expect(ds.saveMetricEntry({metricId: metric.id, date: DAY, value: 1})).rejects.toBeInstanceOf(models.DataNotFoundError);
  });

  test('type cannot change after values exist, and scale values are validated', async () => {
    const {ds, models} = openApp();
    const metric = await ds.createCustomMetric({name: 'Calm', valueType: 'scale'});
    await expect(ds.saveMetricEntry({metricId: metric.id, date: DAY, value: 9})).rejects.toBeInstanceOf(models.DataValidationError);
    await ds.saveMetricEntry({metricId: metric.id, date: DAY, value: 3});
    await expect(ds.updateCustomMetric(metric.id, {valueType: 'number'})).rejects.toBeInstanceOf(models.DataValidationError);
  });
});

describe('goals, reminders and preferences', () => {
  test('goal toggling never duplicates and survives a restart', async () => {
    let {ds} = openApp();
    await Promise.all([ds.setGoalByTitle('Sleep 7+ hours', true), ds.setGoalByTitle('sleep 7+ hours', true)]);
    ({ds} = openApp());
    expect(await ds.listGoals()).toHaveLength(1);
    await ds.setGoalByTitle('Sleep 7+ hours', false);
    expect(await ds.listGoals()).toHaveLength(0);
  });

  test('reminder presets are created once and toggle', async () => {
    const {ds} = openApp();
    const preset = {label: 'Morning check-in', kind: 'check-in', time: '09:00'};
    await ds.setReminderPreset(preset, true);
    await ds.setReminderPreset(preset, false);
    const reminders = await ds.listReminders();
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({enabled: false, time: '09:00'});
  });

  test('changing a reminder time keeps it switched as it was and never duplicates it', async () => {
    const {ds, models} = openApp();
    const preset = {label: 'Evening journal', kind: 'journal', time: '20:30'};
    await ds.setReminderTime(preset, '21:15');
    expect((await ds.listReminders())[0]).toMatchObject({time: '21:15', enabled: false});
    await ds.setReminderPreset(preset, true);
    await ds.setReminderTime(preset, '22:00');
    const reminders = await ds.listReminders();
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({time: '22:00', enabled: true});
    await expect(ds.setReminderTime(preset, '99:99')).rejects.toBeInstanceOf(models.DataValidationError);
  });

  test('invalid reminder times are rejected', async () => {
    const {ds, models} = openApp();
    await expect(ds.setReminderPreset({label: 'Late', kind: 'custom', time: '25:00'}, true)).rejects.toBeInstanceOf(models.DataValidationError);
    expect(await ds.listReminders()).toHaveLength(0);
  });

  test('preferences start with defaults, merge patches and validate', async () => {
    let {ds, models} = openApp();
    expect(await ds.getPreferences()).toMatchObject({weekStart: 'monday', units: {water: 'glasses', distance: 'km'}});
    await ds.updatePreferences({units: {water: 'ml'}});
    await ds.updatePreferences({notifications: {dailyReminders: true}});
    ({ds, models} = openApp());
    expect(await ds.getPreferences()).toMatchObject({
      units: {water: 'ml', distance: 'km'},
      notifications: {dailyReminders: true, weeklySummary: false},
      theme: 'dark',
    });
    await expect(ds.updatePreferences({weekStart: 'friday'})).rejects.toBeInstanceOf(models.DataValidationError);
    await expect(ds.updatePreferences({units: {water: 'gallons'}})).rejects.toBeInstanceOf(models.DataValidationError);
  });
});

describe('storage safety', () => {
  test('every synced change is queued in the outbox', async () => {
    const {ds, store} = openApp();
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'queued'});
    const ops = await store.listOutboxOps();
    expect(ops).toEqual([expect.objectContaining({collection: 'journalEntries', id: entry.id, type: 'upsert'})]);
  });

  test('an unreadable record is left untouched, reported and never overwritten', async () => {
    const key = `${PREFIX}rec/journalEntries/broken`;
    mockStorage.set(key, '{not json');
    const {ds, store} = openApp();
    await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'fine'});
    expect(await ds.listJournalEntries()).toHaveLength(1);
    expect((await store.getStorageHealth()).corruptRecords).toBe(1);
    await expect(ds.getJournalEntry('broken')).rejects.toMatchObject({name: 'DataCorruptionError'});
    await expect(ds.updateJournalEntry('broken', {journal: 'x'})).rejects.toBeDefined();
    expect(mockStorage.get(key)).toBe('{not json');
  });

  test('accounts are isolated from each other and from the device scope', async () => {
    const {ds, store} = openApp();
    await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'device'});
    await store.setActiveScope('userA');
    await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'A'});
    await store.setActiveScope('userB');
    expect(await ds.listJournalEntries()).toHaveLength(0);
    await store.setActiveScope('userA');
    expect((await ds.listJournalEntries()).map(e => e.journal)).toEqual(['A']);
    await store.setActiveScope(null);
    expect((await ds.listJournalEntries()).map(e => e.journal)).toEqual(['device']);
    await expect(store.setActiveScope('../evil')).rejects.toBeDefined();
  });
});

describe('legacy data', () => {
  const LEGACY_KEY = '@cranium-conscious/journal-entries';

  test('earlier journal entries are imported once, additively, and the original key is untouched', async () => {
    const legacy = JSON.stringify([
      {date: DAY, time: '08:00 AM', moodValue: 4, journal: 'Old one'},
      {date: DAY, time: '08:00 AM', moodValue: 4, journal: 'Old one'},
      {date: 'bad', moodValue: 4, journal: 'invalid date'},
    ]);
    mockStorage.set(LEGACY_KEY, legacy);

    let {ds, store} = openApp();
    expect(await ds.listJournalEntries()).toHaveLength(2);
    expect((await store.getStorageHealth()).upgradeIssues.join(' ')).toMatch(/invalid/);

    ({ds} = openApp());
    expect(await ds.listJournalEntries()).toHaveLength(2);
    expect(mockStorage.get(LEGACY_KEY)).toBe(legacy);
  });

  test('an unreadable legacy key is left alone and nothing is marked imported', async () => {
    mockStorage.set(LEGACY_KEY, '{oops');
    const {ds, store} = openApp();
    expect(await ds.listJournalEntries()).toHaveLength(0);
    expect((await store.getStorageHealth()).upgradeIssues).toHaveLength(1);
    expect(mockStorage.get(LEGACY_KEY)).toBe('{oops');
    expect(mockStorage.has(`${PREFIX}meta/upgrade/legacy-local`)).toBe(false);
  });
});
