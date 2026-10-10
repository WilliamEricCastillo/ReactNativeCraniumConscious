// Data models for Cranium Conscious. The project is plain JavaScript, so types are JSDoc typedefs
// (checkable later with `checkJs`) plus small runtime validators. See docs/data-schema.md.
import {isValidISODate} from '../../src/utils/dates';

export const SCHEMA_VERSION = 1;

// Synced collections. `settings` holds one doc (id "preferences"); `profile` holds one doc (id "profile")
// whose cloud location is `users/{uid}` itself.
export const COLLECTIONS = {
  journalEntries: 'journalEntries',
  dailyCheckIns: 'dailyCheckIns',
  customMetrics: 'customMetrics',
  metricEntries: 'metricEntries',
  goals: 'goals',
  reminders: 'reminders',
  settings: 'settings',
  profile: 'profile',
};
export const SYNCED_COLLECTIONS = Object.values(COLLECTIONS);

// Device-only data that is never queued or uploaded (unsaved writing, private by design).
export const LOCAL_ONLY_COLLECTIONS = {drafts: 'drafts'};

export const PREFERENCES_ID = 'preferences';
export const PROFILE_ID = 'profile';

export const SCALE_UNIT = 'scale_1_5';

// One glass of water in millilitres, used only to display water in ml or oz.
export const GLASS_ML = 250;

// Built-in metrics. `storage: 'checkIn'` metrics live on the daily check-in (one source of truth) and are
// exposed through the metric API; `daily: 'set'` means one record per day (deterministic id, upserted).
export const BUILTIN_METRICS = {
  mood: {id: 'mood', name: 'Mood', unit: SCALE_UNIT, storage: 'checkIn'},
  energy: {id: 'energy', name: 'Energy', unit: SCALE_UNIT, storage: 'checkIn'},
  stress: {id: 'stress', name: 'Stress', unit: SCALE_UNIT, storage: 'checkIn'},
  focus: {id: 'focus', name: 'Focus', unit: SCALE_UNIT, storage: 'checkIn'},
  sleep: {id: 'sleep', name: 'Sleep', unit: 'hours', max: 24, storage: 'entry', daily: 'set'},
  exercise: {id: 'exercise', name: 'Exercise', unit: 'minutes', max: 1440, storage: 'entry', daily: 'set'},
  water: {id: 'water', name: 'Water', unit: 'glasses', max: 100, storage: 'entry', daily: 'set'},
  meal: {id: 'meal', name: 'Meal', unit: 'meals', max: 1, storage: 'entry', daily: 'append'},
};

export const MAX_JOURNAL_LENGTH = 50000;

export const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/**
 * Timestamps are ISO 8601 UTC strings locally and in Firestore. `date` is a local calendar day "YYYY-MM-DD".
 * `rev` is a per-record revision (+1 on every local change) used for sync conflict detection.
 *
 * @typedef {Object} Meta
 * @property {number} schemaVersion
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} rev
 *
 * @typedef {Meta & {
 *   id: string, date: string, time: string, moodValue: 1|2|3|4|5, journal: string, prompt?: string,
 *   source: 'app'|'legacy-local'|'legacy-firestore'|'conflict-copy',
 *   legacyDocId?: string, conflictOf?: string
 * }} JournalEntry
 *
 * @typedef {Meta & {
 *   id: string, date: string,
 *   mood: number|null, energy: number|null, stress: number|null, focus: number|null, scale: string
 * }} DailyCheckIn
 *
 * @typedef {Meta & {
 *   id: string, name: string, unit: string, valueType: 'number'|'scale'|'boolean', archivedAt: string|null
 * }} CustomMetric
 *
 * @typedef {Meta & {
 *   id: string, metricId: string, metricKind: 'builtin'|'custom', date: string, value: number, unit: string,
 *   recordedAt: string, label?: string, category?: string, note?: string
 * }} MetricEntry
 *
 * @typedef {Meta & {
 *   id: string, title: string, metricId: string|null,
 *   target: {value: number, unit: string, period: 'day'|'week'}|null, status: 'active'|'archived'
 * }} Goal
 *
 * @typedef {Meta & {
 *   id: string, label: string, kind: 'check-in'|'journal'|'weekly-review'|'custom',
 *   time: string, daysOfWeek: number[], enabled: boolean
 * }} Reminder
 *
 * @typedef {Meta & {
 *   id: 'preferences', theme: 'dark',
 *   units: {water: 'glasses'|'ml'|'oz', distance: 'km'|'mi'},
 *   weekStart: 'sunday'|'monday'|'saturday',
 *   notifications: {dailyReminders: boolean, weeklySummary: boolean},
 *   trackedMetricIds: string[]
 * }} Preferences
 *
 * @typedef {Meta & {id: 'profile', displayName: string|null}} UserProfile
 */

export class DataValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'DataValidationError';
    this.field = field;
  }
}

export class DataNotFoundError extends Error {
  constructor(collection, id) {
    super(`No ${collection} record with that id.`);
    this.name = 'DataNotFoundError';
    this.collection = collection;
    this.id = id;
  }
}

// A stored value exists but cannot be read; it is never overwritten or deleted automatically.
export class DataCorruptionError extends Error {
  constructor(collection, id) {
    super('A stored record on this device could not be read.');
    this.name = 'DataCorruptionError';
    this.collection = collection;
    this.id = id;
  }
}

const fail = (field, message) => {
  throw new DataValidationError(field, message);
};

const isScale = v => Number.isInteger(v) && v >= 1 && v <= 5;

export const assertId = id => {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_.-]{1,200}$/.test(id)) fail('id', 'Invalid record id.');
};

export const newId = prefix =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const nowISO = () => new Date().toISOString();

export const meta = (existing, now = nowISO()) => ({
  schemaVersion: SCHEMA_VERSION,
  createdAt: existing?.createdAt || now,
  updatedAt: now,
  rev: (existing?.rev || 0) + 1,
});

export const requireDate = (date, field = 'date') => {
  if (!isValidISODate(date)) fail(field, 'Date must be a valid YYYY-MM-DD value.');
};

export const validateJournalInput = ({date, time, moodValue, journal, prompt}) => {
  requireDate(date);
  if (!isScale(moodValue)) fail('moodValue', 'Mood must be a whole number from 1 to 5.');
  if (typeof journal !== 'string' || journal.trim() === '') fail('journal', 'Journal text is required.');
  if (journal.length > MAX_JOURNAL_LENGTH) fail('journal', 'Journal text is too long.');
  if (time != null && (typeof time !== 'string' || time.length > 20)) fail('time', 'Time is invalid.');
  if (prompt != null && (typeof prompt !== 'string' || prompt.length > 500)) fail('prompt', 'Prompt is invalid.');
};

const CHECK_IN_FIELDS = ['mood', 'energy', 'stress', 'focus'];

export const validateCheckInInput = ({date, ...values}) => {
  requireDate(date);
  if (!CHECK_IN_FIELDS.some(field => values[field] !== undefined)) fail('mood', 'Provide at least one value.');
  CHECK_IN_FIELDS.forEach(field => {
    if (values[field] != null && !isScale(values[field])) fail(field, `${field} must be a whole number from 1 to 5.`);
  });
};

export const VALUE_TYPES = ['number', 'scale', 'boolean'];

export const validateCustomMetricInput = ({name, unit, valueType}) => {
  if (typeof name !== 'string' || name.trim() === '') fail('name', 'Metric name is required.');
  if (name.length > 60) fail('name', 'Metric name is too long.');
  if (unit != null && (typeof unit !== 'string' || unit.length > 30)) fail('unit', 'Unit must be short text.');
  if (!VALUE_TYPES.includes(valueType)) fail('valueType', 'Unknown metric type.');
};

export const validateMetricValue = (valueType, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('value', 'Value must be a number.');
  if (valueType === 'scale' && !isScale(value)) fail('value', 'Value must be a whole number from 1 to 5.');
  if (valueType === 'boolean' && value !== 0 && value !== 1) fail('value', 'Value must be yes (1) or no (0).');
  if (value < 0) fail('value', 'Value cannot be negative.');
};

// `definition` is the custom metric definition for non-built-in metrics.
export const validateMetricEntryInput = ({metricId, date, value, unit}, definition = null) => {
  if (typeof metricId !== 'string' || metricId === '') fail('metricId', 'Metric is required.');
  requireDate(date);
  validateMetricValue(definition ? definition.valueType : 'number', value);
  const builtin = hasOwn(BUILTIN_METRICS, metricId) ? BUILTIN_METRICS[metricId] : null;
  if (builtin?.max != null && value > builtin.max) fail('value', `${builtin.name} must be at most ${builtin.max} ${builtin.unit}.`);
  if (typeof unit !== 'string' || unit === '') fail('unit', 'A unit is required.');
};

export const validateGoalInput = ({title, target, status}) => {
  if (typeof title !== 'string' || title.trim() === '') fail('title', 'Goal title is required.');
  if (target && (!Number.isFinite(target.value) || !target.unit || !['day', 'week'].includes(target.period))) {
    fail('target', 'Goal target needs a value, unit, and period.');
  }
  if (status != null && !['active', 'archived'].includes(status)) fail('status', 'Unknown goal status.');
};

export const validateReminderInput = ({label, time, daysOfWeek, kind}) => {
  if (typeof label !== 'string' || label.trim() === '') fail('label', 'Reminder label is required.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail('time', 'Time must be HH:mm (24-hour).');
  if (!Array.isArray(daysOfWeek) || daysOfWeek.some(d => !Number.isInteger(d) || d < 0 || d > 6)) {
    fail('daysOfWeek', 'Days must be numbers from 0 (Sunday) to 6.');
  }
  if (!['check-in', 'journal', 'weekly-review', 'custom'].includes(kind)) fail('kind', 'Unknown reminder kind.');
};

export const validatePreferencesPatch = patch => {
  if (patch.units?.water && !['glasses', 'ml', 'oz'].includes(patch.units.water)) fail('units.water', 'Unknown water unit.');
  if (patch.units?.distance && !['km', 'mi'].includes(patch.units.distance)) fail('units.distance', 'Unknown distance unit.');
  if (patch.weekStart && !['sunday', 'monday', 'saturday'].includes(patch.weekStart)) fail('weekStart', 'Unknown week start.');
  if (patch.trackedMetricIds && (!Array.isArray(patch.trackedMetricIds) || patch.trackedMetricIds.some(id => typeof id !== 'string'))) {
    fail('trackedMetricIds', 'Must be a list of ids.');
  }
  Object.values(patch.notifications || {}).forEach(value => {
    if (typeof value !== 'boolean') fail('notifications', 'Notification settings must be on or off.');
  });
};

export const defaultPreferences = () => ({
  theme: 'dark',
  units: {water: 'glasses', distance: 'km'},
  weekStart: 'monday',
  notifications: {dailyReminders: false, weeklySummary: false},
  trackedMetricIds: ['mood', 'energy', 'stress', 'focus', 'sleep', 'exercise', 'water', 'meal'],
});
