import {format} from 'date-fns';
import {
  COLLECTIONS,
  LOCAL_ONLY_COLLECTIONS,
  BUILTIN_METRICS,
  SCALE_UNIT,
  PREFERENCES_ID,
  PROFILE_ID,
  DataValidationError,
  DataNotFoundError,
  newId,
  nowISO,
  meta,
  hasOwn,
  defaultPreferences,
  requireDate,
  validateJournalInput,
  validateCheckInInput,
  validateCustomMetricInput,
  validateMetricEntryInput,
  validateGoalInput,
  validateReminderInput,
  validatePreferencesPatch,
} from './models';
import {transaction, listRecords, getRecord, upsertRecord, removeRecord, getStorageHealth} from './localStore';
import {getSyncStatus as readSyncStatus, describeSyncStatus, claimLocalData, runSync} from './syncEngine';
import {hashText} from './legacyMapping';

// The only data API screens should use. Local-first: every change is saved to AsyncStorage immediately and queued
// for Firestore. Nothing here touches Firestore; uploading is done by syncEngine.js, and only when its gates pass
// (verified user + explicit claim + flags). Never log record contents; journal text and wellness values are personal.

export {getStorageHealth, claimLocalData, runSync as syncNow};

const byCreated = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);
const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

const createRecord = async (tx, collection, record) => {
  if (await tx.get(collection, record.id)) throw new DataValidationError('id', 'A record with this id already exists.');
  return tx.put(collection, record);
};

const patchRecord = (collection, id, allowed, changes, validate, extra) =>
  transaction(async tx => {
    const existing = await tx.get(collection, id);
    if (!existing) throw new DataNotFoundError(collection, id);
    const next = {...existing};
    allowed.forEach(field => {
      if (changes[field] !== undefined) next[field] = changes[field];
    });
    validate(next);
    if (extra) await extra(tx, existing, next);
    return tx.put(collection, {...next, ...meta(existing)});
  });

// Sync

export const getSyncStatus = async () => {
  const status = await readSyncStatus();
  return {...status, description: describeSyncStatus(status)};
};

// Journal entries

export const createJournalEntry = async ({date, time, moodValue, journal, prompt}) =>
  transaction(async tx => {
    const entry = {
      id: newId('journal'),
      date,
      time: time || format(new Date(), 'hh:mm a'),
      moodValue,
      journal,
      ...(prompt ? {prompt} : {}),
      source: 'app',
      ...meta(null),
    };
    validateJournalInput(entry);
    return createRecord(tx, COLLECTIONS.journalEntries, entry);
  });

export const getJournalEntry = id => getRecord(COLLECTIONS.journalEntries, id);

export const listJournalEntries = async ({date} = {}) => {
  const entries = await listRecords(COLLECTIONS.journalEntries);
  return entries.filter(e => !date || e.date === date).sort(byCreated);
};

export const updateJournalEntry = (id, changes) =>
  patchRecord(COLLECTIONS.journalEntries, id, ['journal', 'moodValue', 'prompt'], changes, validateJournalInput);

export const deleteJournalEntry = id => removeRecord(COLLECTIONS.journalEntries, id);

// Unsaved writing. Device-only: never queued or uploaded.

export const journalDraftId = ({date, entryId, prompt}) =>
  entryId ? `edit_${entryId}` : `new_${date}_${hashText(prompt || '')}`;

export const getJournalDraft = id => getRecord(LOCAL_ONLY_COLLECTIONS.drafts, id);

export const saveJournalDraft = (id, {journal, moodValue}) =>
  upsertRecord(LOCAL_ONLY_COLLECTIONS.drafts, id, () => ({id, journal, moodValue, updatedAt: nowISO()}));

export const clearJournalDraft = id => removeRecord(LOCAL_ONLY_COLLECTIONS.drafts, id);

// Daily check-ins: one per day, merged field by field (undefined keeps, null clears).

export const saveDailyCheckIn = async ({date, ...values}) => {
  validateCheckInInput({date, ...values});
  const id = `checkin_${date}`;
  return transaction(async tx => {
    const existing = await tx.get(COLLECTIONS.dailyCheckIns, id);
    const pick = field => (values[field] !== undefined ? values[field] : existing?.[field] ?? null);
    return tx.put(COLLECTIONS.dailyCheckIns, {
      id,
      date,
      mood: pick('mood'),
      energy: pick('energy'),
      stress: pick('stress'),
      focus: pick('focus'),
      scale: SCALE_UNIT,
      ...meta(existing),
    });
  });
};

export const getDailyCheckIn = date => getRecord(COLLECTIONS.dailyCheckIns, `checkin_${date}`);

export const listDailyCheckIns = async ({from, to} = {}) => {
  const all = await listRecords(COLLECTIONS.dailyCheckIns);
  return all.filter(c => (!from || c.date >= from) && (!to || c.date <= to)).sort((a, b) => (a.date < b.date ? -1 : 1));
};

// Preferences and tracked metrics

const buildPreferences = (existing, patch = {}) => {
  const defaults = defaultPreferences();
  return {
    ...defaults,
    ...existing,
    ...patch,
    id: PREFERENCES_ID,
    theme: 'dark',
    units: {...defaults.units, ...existing?.units, ...patch.units},
    notifications: {...defaults.notifications, ...existing?.notifications, ...patch.notifications},
    ...meta(existing),
  };
};

export const getPreferences = async () => {
  const stored = await getRecord(COLLECTIONS.settings, PREFERENCES_ID);
  const defaults = defaultPreferences();
  return {
    ...defaults,
    ...stored,
    units: {...defaults.units, ...stored?.units},
    notifications: {...defaults.notifications, ...stored?.notifications},
  };
};

export const updatePreferences = async patch => {
  validatePreferencesPatch(patch);
  return upsertRecord(COLLECTIONS.settings, PREFERENCES_ID, existing => buildPreferences(existing, patch));
};

const trackMetricTx = async (tx, metricId, tracked) => {
  const existing = await tx.get(COLLECTIONS.settings, PREFERENCES_ID);
  const ids = new Set(buildPreferences(existing).trackedMetricIds);
  if (tracked) ids.add(metricId);
  else ids.delete(metricId);
  await tx.put(COLLECTIONS.settings, buildPreferences(existing, {trackedMetricIds: [...ids]}));
};

export const setMetricTracked = (metricId, tracked) => transaction(tx => trackMetricTx(tx, metricId, tracked));

// Custom metric definitions (archived, never hard-deleted, so past entries keep their definition)

const nameTaken = (metrics, name, exceptId) =>
  metrics.some(m => !m.archivedAt && m.id !== exceptId && sameText(m.name, name));

const createCustomMetricTx = async (tx, {name, unit = '', valueType = 'number', track = true}) => {
  validateCustomMetricInput({name, unit, valueType});
  if (nameTaken(await tx.list(COLLECTIONS.customMetrics), name)) {
    throw new DataValidationError('name', 'A metric with that name already exists.');
  }
  const metric = {
    id: newId('cmetric'),
    name: name.trim(),
    unit: unit.trim(),
    valueType,
    archivedAt: null,
    ...meta(null),
  };
  await createRecord(tx, COLLECTIONS.customMetrics, metric);
  if (track) await trackMetricTx(tx, metric.id, true);
  return metric;
};

export const createCustomMetric = input => transaction(tx => createCustomMetricTx(tx, input));

export const getCustomMetric = id => getRecord(COLLECTIONS.customMetrics, id);

export const listCustomMetrics = async ({includeArchived = false} = {}) => {
  const all = await listRecords(COLLECTIONS.customMetrics);
  return all.filter(m => includeArchived || !m.archivedAt).sort(byCreated);
};

export const updateCustomMetric = (id, changes) =>
  patchRecord(
    COLLECTIONS.customMetrics,
    id,
    ['name', 'unit', 'valueType'],
    changes,
    validateCustomMetricInput,
    async (tx, existing, next) => {
      if (nameTaken(await tx.list(COLLECTIONS.customMetrics), next.name, id)) {
        throw new DataValidationError('name', 'A metric with that name already exists.');
      }
      if (next.valueType !== existing.valueType) {
        const used = (await tx.list(COLLECTIONS.metricEntries)).some(e => e.metricId === id);
        if (used) throw new DataValidationError('valueType', 'The type cannot change after values are logged.');
      }
    },
  );

export const archiveCustomMetric = id =>
  transaction(async tx => {
    const existing = await tx.get(COLLECTIONS.customMetrics, id);
    if (!existing) throw new DataNotFoundError(COLLECTIONS.customMetrics, id);
    await tx.put(COLLECTIONS.customMetrics, {...existing, archivedAt: nowISO(), ...meta(existing)});
    await trackMetricTx(tx, id, false);
  });

// Metric entries. Mood, energy, stress and focus live on the daily check-in (single source of truth) but are
// saved and read through the same functions as every other metric.

const saveMetricEntryTx = async (tx, {metricId, date, value, unit, label, category}) => {
  const builtin = hasOwn(BUILTIN_METRICS, metricId) ? BUILTIN_METRICS[metricId] : null;
  let definition = null;
  if (!builtin) {
    definition = await tx.get(COLLECTIONS.customMetrics, metricId);
    if (!definition || definition.archivedAt) throw new DataNotFoundError(COLLECTIONS.customMetrics, metricId);
  }
  const resolvedUnit = unit || builtin?.unit || definition?.unit || 'count';
  validateMetricEntryInput({metricId, date, value, unit: resolvedUnit}, definition);

  // sleep/exercise/water hold one value per day; meals and custom values append.
  const id = builtin?.daily === 'set' ? `metric_${metricId}_${date}` : newId('mentry');
  const existing = await tx.get(COLLECTIONS.metricEntries, id);
  const now = nowISO();
  return tx.put(COLLECTIONS.metricEntries, {
    id,
    metricId,
    metricKind: builtin ? 'builtin' : 'custom',
    date,
    value,
    unit: resolvedUnit,
    recordedAt: now,
    ...(label ? {label} : {}),
    ...(category ? {category} : {}),
    ...meta(existing, now),
  });
};

export const saveMetricEntry = async input => {
  if (hasOwn(BUILTIN_METRICS, input.metricId) && BUILTIN_METRICS[input.metricId].storage === 'checkIn') {
    return saveDailyCheckIn({date: input.date, [input.metricId]: input.value});
  }
  return transaction(tx => saveMetricEntryTx(tx, input));
};

export const listMetricEntries = async ({date, metricId} = {}) => {
  const all = await listRecords(COLLECTIONS.metricEntries);
  return all
    .filter(e => (!date || e.date === date) && (!metricId || e.metricId === metricId))
    .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
};

export const deleteMetricEntry = id => removeRecord(COLLECTIONS.metricEntries, id);

// Values over time for any metric, whichever record type stores it.
export const getMetricSeries = async ({metricId, from, to}) => {
  if (hasOwn(BUILTIN_METRICS, metricId) && BUILTIN_METRICS[metricId].storage === 'checkIn') {
    const checkIns = await listDailyCheckIns({from, to});
    return checkIns.filter(c => c[metricId] != null).map(c => ({date: c.date, value: c[metricId], unit: SCALE_UNIT}));
  }
  const entries = await listMetricEntries({metricId});
  return entries
    .filter(e => (!from || e.date >= from) && (!to || e.date <= to))
    .map(e => ({id: e.id, date: e.date, value: e.value, unit: e.unit}));
};

// Reuses an existing definition with the same name, creating one if needed, all in one transaction.
export const logCustomMetricValue = ({name, unit = '', value, date}) =>
  transaction(async tx => {
    validateCustomMetricInput({name, unit, valueType: 'number'});
    const metrics = await tx.list(COLLECTIONS.customMetrics);
    const existing = metrics.find(m => !m.archivedAt && sameText(m.name, name));
    const metric = existing || (await createCustomMetricTx(tx, {name, unit, valueType: 'number'}));
    return saveMetricEntryTx(tx, {metricId: metric.id, date, value, unit: metric.unit || undefined});
  });

// Day snapshot used by Today, Day and the logging screens

export const getDaySnapshot = async date => {
  requireDate(date);
  const [checkIn, metricEntries, journalEntries, customMetrics] = await Promise.all([
    getDailyCheckIn(date),
    listMetricEntries({date}),
    listJournalEntries({date}),
    listCustomMetrics({includeArchived: true}),
  ]);
  const entryOf = id => metricEntries.find(e => e.metricId === id) || null;
  return {
    date,
    checkIn,
    sleepHours: entryOf('sleep')?.value ?? null,
    exerciseMinutes: entryOf('exercise')?.value ?? null,
    exerciseCategory: entryOf('exercise')?.category ?? null,
    waterGlasses: entryOf('water')?.value ?? null,
    meals: metricEntries.filter(e => e.metricId === 'meal'),
    customEntries: metricEntries.filter(e => e.metricKind === 'custom'),
    customMetricNames: Object.fromEntries(customMetrics.map(m => [m.id, m.name])),
    journalEntries,
  };
};

// Goals

export const createGoal = ({title, metricId = null, target = null}) =>
  transaction(async tx => {
    validateGoalInput({title, target});
    const goals = await tx.list(COLLECTIONS.goals);
    if (goals.some(g => g.status === 'active' && sameText(g.title, title))) {
      throw new DataValidationError('title', 'You already have a goal with that title.');
    }
    return createRecord(tx, COLLECTIONS.goals, {
      id: newId('goal'),
      title: title.trim(),
      metricId,
      target,
      status: 'active',
      ...meta(null),
    });
  });

export const listGoals = async ({includeArchived = false} = {}) => {
  const all = await listRecords(COLLECTIONS.goals);
  return all.filter(g => includeArchived || g.status === 'active').sort(byCreated);
};

export const updateGoal = (id, changes) =>
  patchRecord(COLLECTIONS.goals, id, ['title', 'metricId', 'target', 'status'], changes, validateGoalInput);

export const deleteGoal = id => removeRecord(COLLECTIONS.goals, id);

// Turns a suggested goal on or off without ever creating a duplicate.
export const setGoalByTitle = (title, active) =>
  transaction(async tx => {
    const matches = (await tx.list(COLLECTIONS.goals)).filter(g => sameText(g.title, title));
    if (active) {
      if (matches.some(g => g.status === 'active')) return;
      validateGoalInput({title, target: null});
      await createRecord(tx, COLLECTIONS.goals, {
        id: newId('goal'),
        title: title.trim(),
        metricId: null,
        target: null,
        status: 'active',
        ...meta(null),
      });
    } else {
      for (const goal of matches) await tx.remove(COLLECTIONS.goals, goal.id);
    }
  });

// Reminders (stored only; no notification is scheduled by this layer)

export const createReminder = ({label, kind = 'custom', time, daysOfWeek = [0, 1, 2, 3, 4, 5, 6], enabled = false}) =>
  transaction(async tx => {
    validateReminderInput({label, time, daysOfWeek, kind});
    return createRecord(tx, COLLECTIONS.reminders, {
      id: newId('reminder'),
      label: label.trim(),
      kind,
      time,
      daysOfWeek,
      enabled,
      ...meta(null),
    });
  });

export const listReminders = async () => (await listRecords(COLLECTIONS.reminders)).sort(byCreated);

export const updateReminder = (id, changes) =>
  patchRecord(COLLECTIONS.reminders, id, ['label', 'kind', 'time', 'daysOfWeek', 'enabled'], changes, validateReminderInput);

export const deleteReminder = id => removeRecord(COLLECTIONS.reminders, id);

// Finds the reminder with this label (or creates it) and sets enabled, atomically.
export const setReminderPreset = ({label, kind, time, daysOfWeek = [0, 1, 2, 3, 4, 5, 6]}, enabled) =>
  transaction(async tx => {
    const existing = (await tx.list(COLLECTIONS.reminders)).find(r => sameText(r.label, label));
    if (existing) {
      return tx.put(COLLECTIONS.reminders, {...existing, enabled, ...meta(existing)});
    }
    validateReminderInput({label, time, daysOfWeek, kind});
    return createRecord(tx, COLLECTIONS.reminders, {
      id: newId('reminder'),
      label: label.trim(),
      kind,
      time,
      daysOfWeek,
      enabled,
      ...meta(null),
    });
  });

// Profile

export const getUserProfile = async () => (await getRecord(COLLECTIONS.profile, PROFILE_ID)) || {displayName: null};

export const updateUserProfile = ({displayName}) =>
  upsertRecord(COLLECTIONS.profile, PROFILE_ID, existing => ({
    id: PROFILE_ID,
    displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null,
    ...meta(existing),
  }));
