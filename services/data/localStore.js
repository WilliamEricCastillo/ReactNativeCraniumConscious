import AsyncStorage from '@react-native-async-storage/async-storage';
import {readLegacyJournalEntries} from '../localStorage';
import {
  COLLECTIONS,
  SYNCED_COLLECTIONS,
  SCHEMA_VERSION,
  PREFERENCES_ID,
  PROFILE_ID,
  DataCorruptionError,
  assertId,
  validateJournalInput,
  nowISO,
} from './models';
import {approximateTimestamp, hashText} from './legacyMapping';

// Local persistence on AsyncStorage (already a dependency): one key per record, so one large or damaged
// record can never block the rest and a write only touches the record it changes.
//   v3/rec/<collection>/<id>     the record
//   v3/outbox/<collection>/<id>  one pending change per record (coalesced); this is the offline queue
//   v3/base/<collection>/<id>    revision last seen in the cloud (conflict detection)
//   v3/meta/<name>               sync state, upgrade markers, conflict log
// Signed-in accounts use the same layout under `v3/u/<uid>/` (see the scope notes below).
const PREFIX = '@cranium-conscious/v3/';
const V2 = '@cranium-conscious/v2/';

// Account isolation: each signed-in account has its own key space (`v3/u/<uid>/...`). `null` is the device scope
// (signed out, or auth disabled) and keeps the original keys, so existing data is untouched. One account can
// never read or write another account's keys, or the device scope's.
let scope = null;
const root = () => (scope ? `${PREFIX}u/${scope}/` : PREFIX);
const REC = () => `${root()}rec/`;
const OUT = () => `${root()}outbox/`;
const BASE = () => `${root()}base/`;
const META = () => `${root()}meta/`;

const SYNCED = new Set(SYNCED_COLLECTIONS);

const assertCollection = collection => {
  if (typeof collection !== 'string' || !/^[A-Za-z]+$/.test(collection)) throw new Error('Invalid collection.');
};
const recKey = (collection, id) => {
  assertCollection(collection);
  assertId(id);
  return `${REC()}${collection}/${id}`;
};
const opKey = (collection, id) => `${OUT()}${collection}/${id}`;
const baseKey = (collection, id) => `${BASE()}${collection}/${id}`;

const parseJSON = raw => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// All mutations run one at a time; AsyncStorage read-modify-write is not atomic.
let chain = Promise.resolve();
const exclusive = task => {
  const result = chain.then(task);
  chain = result.catch(() => {});
  return result;
};

// Unreadable values are left exactly where they are (they are their own backup) and reported, never overwritten.
const corruptKeys = new Set();
const upgradeIssues = [];

const readRecordRaw = async (collection, id) => {
  const key = recKey(collection, id);
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return null;
  const record = parseJSON(raw);
  if (!isPlainObject(record) || record.id !== id) {
    corruptKeys.add(key);
    throw new DataCorruptionError(collection, id);
  }
  return record;
};

const readPrefixed = async prefix => {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
  if (!keys.length) return [];
  const pairs = await AsyncStorage.multiGet(keys);
  return pairs.filter(([, value]) => value != null).map(([key, value]) => [key.slice(prefix.length), value]);
};

const listRecordsRaw = async collection => {
  assertCollection(collection);
  const prefix = `${REC()}${collection}/`;
  const records = [];
  (await readPrefixed(prefix)).forEach(([id, raw]) => {
    const record = parseJSON(raw);
    if (isPlainObject(record) && record.id === id) records.push(record);
    else corruptKeys.add(`${prefix}${id}`);
  });
  return records;
};

const readMetaRaw = async (name, fallback) => {
  const raw = await AsyncStorage.getItem(`${META()}${name}`);
  if (raw == null) return fallback;
  const value = parseJSON(raw);
  return value === undefined ? fallback : value;
};
const writeMetaRaw = (name, value) => AsyncStorage.setItem(`${META()}${name}`, JSON.stringify(value));

const readObject = async key => {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return null;
  const value = parseJSON(raw);
  return isPlainObject(value) ? value : null;
};

const listOpsRaw = async () =>
  (await readPrefixed(OUT())).map(([, raw]) => parseJSON(raw)).filter(op => isPlainObject(op) && op.collection && op.id);

// Writing a pending change replaces any earlier one for the same record, so the queue holds at most one per record.
const enqueueRaw = async (collection, id, type) => {
  const existing = await readObject(opKey(collection, id));
  const op = {
    collection,
    id,
    type,
    queuedAt: existing?.queuedAt || nowISO(),
    attempts: 0,
    nextAttemptAt: 0,
  };
  await AsyncStorage.setItem(opKey(collection, id), JSON.stringify(op));
};

const changeListeners = new Set();
export const onLocalChange = listener => {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
};
const notifyChange = () => changeListeners.forEach(listener => {
  try {
    listener();
  } catch {
    // listeners must never break a save
  }
});

const makeTx = state => ({
  get: readRecordRaw,
  list: listRecordsRaw,

  // `track: false` is for writes that came from the cloud, which must not be queued for upload again.
  async put(collection, record, {track = true} = {}) {
    const key = recKey(collection, record.id);
    const json = JSON.stringify(record);
    if (track && SYNCED.has(collection)) {
      const existing = await readObject(opKey(collection, record.id));
      const op = {
        collection,
        id: record.id,
        type: 'upsert',
        queuedAt: existing?.queuedAt || nowISO(),
        attempts: 0,
        nextAttemptAt: 0,
      };
      await AsyncStorage.multiSet([[key, json], [opKey(collection, record.id), JSON.stringify(op)]]);
      state.dirty = true;
    } else {
      await AsyncStorage.setItem(key, json);
    }
    return record;
  },

  async remove(collection, id, {track = true} = {}) {
    const key = recKey(collection, id);
    if ((await AsyncStorage.getItem(key)) == null) return false;
    if (track && SYNCED.has(collection)) {
      // A record the cloud has never seen needs no delete; otherwise the delete is queued before the record goes.
      if (await readObject(baseKey(collection, id))) await enqueueRaw(collection, id, 'delete');
      else await AsyncStorage.removeItem(opKey(collection, id));
      state.dirty = true;
    }
    await AsyncStorage.removeItem(key);
    return true;
  },

  getBase: (collection, id) => readObject(baseKey(collection, id)),
  setBase: (collection, id, base) => AsyncStorage.setItem(baseKey(collection, id), JSON.stringify(base)),
  getOp: (collection, id) => readObject(opKey(collection, id)),
  removeOp: (collection, id) => AsyncStorage.removeItem(opKey(collection, id)),
  async patchOp(collection, id, patch) {
    const op = await readObject(opKey(collection, id));
    if (op) await AsyncStorage.setItem(opKey(collection, id), JSON.stringify({...op, ...patch}));
  },
  enqueue: (collection, id, type) => enqueueRaw(collection, id, type),
  readMeta: readMetaRaw,
  writeMeta: writeMetaRaw,

  // Queues every record the cloud has not confirmed; used once when a verified user claims this device's data.
  async enqueueUnsynced() {
    let queued = 0;
    for (const collection of SYNCED_COLLECTIONS) {
      for (const record of await listRecordsRaw(collection)) {
        const [op, base] = await Promise.all([
          readObject(opKey(collection, record.id)),
          readObject(baseKey(collection, record.id)),
        ]);
        if (!op && (!base || base.rev !== record.rev)) {
          await enqueueRaw(collection, record.id, 'upsert');
          queued += 1;
        }
      }
    }
    return queued;
  },
});

const importV2Collections = async () => {
  for (const collection of SYNCED_COLLECTIONS) {
    const marker = `upgrade/v2-${collection}`;
    if (await readMetaRaw(marker, null)) continue;
    try {
      let records = [];
      if (collection === COLLECTIONS.settings || collection === COLLECTIONS.profile) {
        const isSettings = collection === COLLECTIONS.settings;
        const value = await readObject(`${V2}${isSettings ? 'preferences' : 'profile'}`);
        if (value) records = [{...value, id: isSettings ? PREFERENCES_ID : PROFILE_ID}];
        else if ((await AsyncStorage.getItem(`${V2}${isSettings ? 'preferences' : 'profile'}`)) != null) {
          throw new Error('unreadable');
        }
      } else {
        const raw = await AsyncStorage.getItem(`${V2}${collection}`);
        if (raw != null) {
          const map = parseJSON(raw);
          if (!isPlainObject(map)) throw new Error('unreadable');
          records = Object.entries(map)
            .filter(([, record]) => isPlainObject(record))
            .map(([id, record]) => ({...record, id}));
        }
      }
      for (const record of records) {
        let key;
        try {
          key = recKey(collection, record.id);
        } catch {
          continue;
        }
        if ((await AsyncStorage.getItem(key)) != null) continue;
        const rev = Number.isInteger(record.rev) && record.rev > 0 ? record.rev : 1;
        await AsyncStorage.setItem(key, JSON.stringify({...record, rev}));
      }
      await writeMetaRaw(marker, {at: nowISO(), count: records.length});
    } catch {
      upgradeIssues.push(`Earlier ${collection} data could not be read and was left untouched.`);
    }
  }
};

// One-time, additive import of Phase 1 journal entries. The legacy key is never modified or removed.
const importLegacyLocalJournal = async () => {
  const marker = 'upgrade/legacy-local';
  if (await readMetaRaw(marker, null)) return;
  try {
    // Phase 2 already imported these into its own store, which importV2Collections carried over.
    if ((await AsyncStorage.getItem(`${V2}upgrade/legacy-local-journal`)) != null) {
      await writeMetaRaw(marker, {at: nowISO(), imported: 0, skipped: 0, viaV2: true});
      return;
    }
    const legacy = await readLegacyJournalEntries();
    const seen = new Map();
    let imported = 0;
    let skipped = 0;

    for (const old of legacy) {
      try {
        validateJournalInput({date: old?.date, moodValue: old?.moodValue, journal: old?.journal});
      } catch {
        skipped += 1;
        continue;
      }
      let id = typeof old.id === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(old.id) ? old.id : null;
      if (!id) {
        const base = `legacy_${old.date}_${hashText(`${old.time}|${old.journal}`)}`;
        const count = (seen.get(base) || 0) + 1;
        seen.set(base, count);
        id = count === 1 ? base : `${base}_${count}`;
      }
      const key = recKey(COLLECTIONS.journalEntries, id);
      if ((await AsyncStorage.getItem(key)) != null) continue;
      const createdAt = approximateTimestamp(old.date, old.time) || nowISO();
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          id,
          date: old.date,
          time: typeof old.time === 'string' ? old.time : '',
          moodValue: old.moodValue,
          journal: old.journal,
          ...(typeof old.prompt === 'string' && old.prompt ? {prompt: old.prompt} : {}),
          source: 'legacy-local',
          schemaVersion: SCHEMA_VERSION,
          createdAt,
          updatedAt: createdAt,
          rev: 1,
        }),
      );
      imported += 1;
    }
    await writeMetaRaw(marker, {at: nowISO(), imported, skipped});
    if (skipped) upgradeIssues.push(`${skipped} earlier journal entries were invalid and stay only in the old backup key.`);
  } catch {
    upgradeIssues.push('Earlier journal entries could not be read; they were left untouched.');
  }
};

export class ScopeChangedError extends Error {
  constructor() {
    super('The signed-in account changed.');
    this.name = 'ScopeChangedError';
  }
}

let ready;
const ensureReady = () => {
  if (!ready) {
    ready = exclusive(async () => {
      // Data from earlier versions belongs to the device scope only; an account's key space starts empty.
      if (scope === null) {
        await importV2Collections();
        await importLegacyLocalJournal();
      }
    }).catch(error => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
};

// Waits until this scope is ready, and fails if the account changed meanwhile so nothing lands in the wrong account.
const inScope = async fn => {
  const start = scope;
  await ensureReady();
  if (scope !== start) throw new ScopeChangedError();
  return fn();
};

export const getActiveScope = () => scope;

// Called by AuthGate on every sign-in/out. Waits for in-flight writes first. A non-null uid must be valid:
// falling back to the device scope would expose another user's local data to this account.
export const setActiveScope = uid => {
  if (uid !== null && (typeof uid !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(uid))) {
    return Promise.reject(new Error('Invalid account id.'));
  }
  return exclusive(async () => {
    if (uid === scope) return;
    scope = uid;
    ready = undefined;
    corruptKeys.clear();
    upgradeIssues.length = 0;
  });
};

export const transaction = async fn => {
  const start = scope;
  await ensureReady();
  const state = {dirty: false};
  const result = await exclusive(() => {
    if (scope !== start) throw new ScopeChangedError();
    return fn(makeTx(state));
  });
  if (state.dirty) notifyChange();
  return result;
};

export const listRecords = collection => inScope(() => listRecordsRaw(collection));

export const getRecord = (collection, id) => inScope(() => readRecordRaw(collection, id));

// `build(existing)` returns the full record to store; throwing from it aborts the write.
export const upsertRecord = (collection, id, build) =>
  transaction(async tx => {
    const next = build(await tx.get(collection, id));
    if (next.id !== id) throw new Error('Record id mismatch.');
    return tx.put(collection, next);
  });

export const removeRecord = (collection, id) => transaction(tx => tx.remove(collection, id));

export const listOutboxOps = () => inScope(() => listOpsRaw());

export const readBase = (collection, id) => inScope(() => readObject(baseKey(collection, id)));

export const readMeta = (name, fallback) => inScope(() => readMetaRaw(name, fallback));

export const getStorageHealth = () => inScope(() => ({corruptRecords: corruptKeys.size, upgradeIssues: [...upgradeIssues]}));
