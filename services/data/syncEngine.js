import {AUTH_ENABLED, CLOUD_SYNC_ENABLED, FIRESTORE_RULES_VERIFIED} from '../../src/config/features';
import {COLLECTIONS, SYNCED_COLLECTIONS, newId, nowISO, validateJournalInput} from './models';
import {transaction, getRecord, listOutboxOps, readBase, readMeta, getActiveScope} from './localStore';

// Offline-first sync between the local store and Firestore (design: docs/data-schema.md).
// Nothing here runs unless every gate in getSyncGate() passes. Never log records, tokens or error messages.

const STATE = 'sync';
const CONFLICTS = 'conflicts';
const MAX_CONFLICT_LOG = 50;
const STOP_CODES = new Set(['permission-denied', 'unauthenticated', 'unavailable', 'deadline-exceeded', 'network-request-failed']);

export class SyncBlockedError extends Error {
  constructor(reasons) {
    super(`Sync is blocked: ${reasons.join(', ')}`);
    this.name = 'SyncBlockedError';
    this.reasons = reasons;
  }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const defaultState = () => ({deviceId: null, ownerUid: null, claimedAt: null, cursors: {}, lastSyncAt: null});
const loadState = async tx => ({...defaultState(), ...(await tx.readMeta(STATE, {}))});

const flagReasons = () => {
  const reasons = [];
  if (!AUTH_ENABLED) reasons.push('auth-disabled');
  if (!CLOUD_SYNC_ENABLED) reasons.push('cloud-sync-disabled');
  if (!FIRESTORE_RULES_VERIFIED) reasons.push('rules-unverified');
  return reasons;
};

// The cloud is only touched when flags are on, Firebase Auth has a current user, and that user owns this device's data.
export const getSyncGate = async () => {
  const reasons = flagReasons();
  if (reasons.length) return {allowed: false, reasons, uid: null};

  const uid = await require('./firestoreRemote').getVerifiedUid();
  if (!uid) return {allowed: false, reasons: ['no-verified-user'], uid: null};

  // The local store must be scoped to this same account; never sync device-scope or another account's data.
  if (getActiveScope() !== uid) return {allowed: false, reasons: ['ownership-mismatch'], uid};

  const state = {...defaultState(), ...(await readMeta(STATE, {}))};
  if (!state.ownerUid) return {allowed: false, reasons: ['ownership-unclaimed'], uid};
  if (state.ownerUid !== uid) return {allowed: false, reasons: ['ownership-mismatch'], uid};
  return {allowed: true, reasons: [], uid};
};

// Explicit, user-confirmed step: ties this device's local data to the signed-in uid and queues it for upload.
// Never called automatically. Refuses if another account already owns the local data.
export const claimLocalData = async () => {
  const reasons = flagReasons();
  if (reasons.length) throw new SyncBlockedError(reasons);
  const uid = await require('./firestoreRemote').getVerifiedUid();
  if (!uid) throw new SyncBlockedError(['no-verified-user']);
  if (getActiveScope() !== uid) throw new SyncBlockedError(['ownership-mismatch']);

  return transaction(async tx => {
    const state = await loadState(tx);
    if (state.ownerUid && state.ownerUid !== uid) throw new SyncBlockedError(['ownership-mismatch']);
    if (!state.deviceId) state.deviceId = newId('device');
    if (!state.ownerUid) {
      state.ownerUid = uid;
      state.claimedAt = nowISO();
    }
    await tx.writeMeta(STATE, state);
    return tx.enqueueUnsynced();
  });
};

const getDeviceId = () =>
  transaction(async tx => {
    const state = await loadState(tx);
    if (!state.deviceId) {
      state.deviceId = newId('device');
      await tx.writeMeta(STATE, state);
    }
    return state.deviceId;
  });

const saveCursor = (collection, cursor) =>
  transaction(async tx => {
    const state = await loadState(tx);
    await tx.writeMeta(STATE, {...state, cursors: {...state.cursors, [collection]: cursor}});
  });

const logConflict = async (tx, entry) => {
  const existing = await tx.readMeta(CONFLICTS, []);
  const log = Array.isArray(existing) ? existing : [];
  log.push({at: nowISO(), ...entry});
  await tx.writeMeta(CONFLICTS, log.slice(-MAX_CONFLICT_LOG));
};

// Content comparison ignores bookkeeping so identical edits made on two devices are not reported as conflicts.
const BOOKKEEPING = ['rev', 'updatedAt', 'createdAt', 'schemaVersion', 'source', 'conflictOf', 'legacyDocId'];
const CLOUD_ONLY = ['serverUpdatedAt', 'deleted', 'deletedAt', 'deviceId'];

const stable = value =>
  JSON.stringify(value, (key, v) =>
    isObject(v) ? Object.keys(v).sort().reduce((sorted, k) => ({...sorted, [k]: v[k]}), {}) : v,
  );
const contentOf = record => {
  const copy = {...record};
  BOOKKEEPING.forEach(key => delete copy[key]);
  return copy;
};
const sameContent = (a, b) => stable(contentOf(a)) === stable(contentOf(b));
const fromCloud = data => {
  const record = {...data};
  CLOUD_ONLY.forEach(key => delete record[key]);
  return record;
};

const isValidRemote = (collection, id, data) => {
  if (!isObject(data) || data.id !== id) return false;
  if (!Number.isInteger(data.rev) || data.rev < 1 || typeof data.updatedAt !== 'string') return false;
  if (data.deleted === true) return true;
  if (collection === COLLECTIONS.journalEntries) {
    try {
      validateJournalInput(data);
    } catch {
      return false;
    }
  }
  return true;
};

const isNewer = (aTime, aDevice, bTime, bDevice) =>
  aTime !== bTime ? aTime > bTime : String(aDevice || '') > String(bDevice || '');

const setBaseFrom = (tx, collection, id, remoteDoc) =>
  tx.setBase(collection, id, {
    rev: remoteDoc.rev,
    updatedAt: remoteDoc.updatedAt,
    ...(remoteDoc.deleted ? {deleted: true} : {}),
  });

// Both sides changed the same record since they last agreed. Nothing is deleted or silently overwritten:
//  - journal entries: keep BOTH. The cloud version stays at this id; the local version becomes a separate copy.
//  - everything else: newest change wins (ties broken by device id) and the loser is kept in the local conflict log.
//  - an edit always beats a delete.
const resolveConflict = async (tx, collection, local, remoteDoc, deviceId, result) => {
  const id = local.id;
  result.conflicts += 1;

  if (remoteDoc.deleted) {
    await setBaseFrom(tx, collection, id, remoteDoc);
    await tx.put(collection, {...local, rev: Math.max(local.rev, remoteDoc.rev) + 1});
    await logConflict(tx, {collection, id, resolution: 'kept-local-over-delete'});
    return;
  }

  const remoteRecord = fromCloud(remoteDoc);

  if (sameContent(local, remoteRecord)) {
    await tx.put(collection, remoteRecord, {track: false});
    await setBaseFrom(tx, collection, id, remoteDoc);
    await tx.removeOp(collection, id);
    result.conflicts -= 1;
    return;
  }

  if (collection === COLLECTIONS.journalEntries) {
    // Deterministic copy id: retrying this step can never create a second copy.
    const copyId = `${id}_conflict_${local.rev}_${String(deviceId).slice(-8)}`;
    if (!(await tx.get(collection, copyId))) {
      await tx.put(collection, {...local, id: copyId, source: 'conflict-copy', conflictOf: id, rev: 1, updatedAt: nowISO()});
    }
    await tx.put(collection, remoteRecord, {track: false});
    await setBaseFrom(tx, collection, id, remoteDoc);
    await tx.removeOp(collection, id);
    await logConflict(tx, {collection, id, resolution: 'kept-both', copyId});
    return;
  }

  if (isNewer(local.updatedAt, deviceId, remoteDoc.updatedAt, remoteDoc.deviceId)) {
    await setBaseFrom(tx, collection, id, remoteDoc);
    await tx.put(collection, {...local, rev: Math.max(local.rev, remoteDoc.rev) + 1});
    await logConflict(tx, {collection, id, resolution: 'kept-local'});
  } else {
    await tx.put(collection, remoteRecord, {track: false});
    await setBaseFrom(tx, collection, id, remoteDoc);
    await tx.removeOp(collection, id);
    await logConflict(tx, {collection, id, resolution: 'kept-remote', replacedLocal: local});
  }
};

// Applies one cloud document to the local store (used for pulls and for push conflicts).
const applyRemote = async (tx, collection, id, remoteDoc, deviceId, result) => {
  const [local, op, base] = await Promise.all([tx.get(collection, id), tx.getOp(collection, id), tx.getBase(collection, id)]);

  if (remoteDoc.deleted) {
    if (!local) {
      await setBaseFrom(tx, collection, id, remoteDoc);
      if (op) await tx.removeOp(collection, id);
    } else if (op) {
      await resolveConflict(tx, collection, local, remoteDoc, deviceId, result);
    } else {
      await tx.remove(collection, id, {track: false});
      await setBaseFrom(tx, collection, id, remoteDoc);
    }
    return;
  }

  const remoteRecord = fromCloud(remoteDoc);

  if (!local) {
    // Our queued delete only wins if the cloud copy has not changed since we last saw it.
    if (op && op.type === 'delete' && base && remoteDoc.rev <= base.rev) return;
    await tx.put(collection, remoteRecord, {track: false});
    await setBaseFrom(tx, collection, id, remoteDoc);
    if (op) await tx.removeOp(collection, id);
    return;
  }

  if (!op) {
    if (remoteDoc.rev > local.rev) {
      await tx.put(collection, remoteRecord, {track: false});
      await setBaseFrom(tx, collection, id, remoteDoc);
    } else if (remoteDoc.rev === local.rev) {
      await setBaseFrom(tx, collection, id, remoteDoc);
    } else {
      // Local is ahead with nothing queued (interrupted save): queue it; the push step detects any conflict.
      await setBaseFrom(tx, collection, id, remoteDoc);
      await tx.enqueue(collection, id, 'upsert');
    }
    return;
  }

  await resolveConflict(tx, collection, local, remoteDoc, deviceId, result);
};

const failOp = (op, error) =>
  transaction(async tx => {
    const current = await tx.getOp(op.collection, op.id);
    if (!current) return;
    const delay = Math.min(30000 * 2 ** Math.min(current.attempts || 0, 7), 3600000);
    await tx.patchOp(op.collection, op.id, {
      attempts: (current.attempts || 0) + 1,
      nextAttemptAt: Date.now() + delay + Math.floor(Math.random() * 5000),
      lastError: error && typeof error.code === 'string' ? error.code : 'unknown',
    });
  });

const pushOp = async (remote, op, deviceId, result) => {
  const {collection, id} = op;

  if (op.type === 'delete') {
    const base = await readBase(collection, id);
    const response = await remote.pushDelete(collection, id, base ? base.rev : null);
    await transaction(async tx => {
      if (response.status === 'ok') {
        await tx.setBase(collection, id, {rev: response.rev, updatedAt: nowISO(), deleted: true});
        const current = await tx.getOp(collection, id);
        if (current && current.type === 'delete') await tx.removeOp(collection, id);
        result.pushed += 1;
      } else {
        await applyRemote(tx, collection, id, response.remote, deviceId, result);
      }
    });
    return;
  }

  const record = await getRecord(collection, id);
  if (!record) {
    await transaction(tx => tx.removeOp(collection, id));
    return;
  }
  const base = await readBase(collection, id);
  const response = await remote.push(collection, record, base ? base.rev : null);
  await transaction(async tx => {
    if (response.status === 'ok') {
      const current = await tx.get(collection, id);
      await tx.setBase(collection, id, {rev: record.rev, updatedAt: record.updatedAt});
      if (!current) await tx.enqueue(collection, id, 'delete');
      else if (current.rev === record.rev) await tx.removeOp(collection, id);
      result.pushed += 1;
    } else {
      await applyRemote(tx, collection, id, response.remote, deviceId, result);
    }
  });
};

const push = async (remote, deviceId, result) => {
  const now = Date.now();
  const ops = (await listOutboxOps())
    .filter(op => (op.nextAttemptAt || 0) <= now)
    .sort((a, b) => (a.queuedAt < b.queuedAt ? -1 : 1));

  for (const op of ops) {
    try {
      await pushOp(remote, op, deviceId, result);
    } catch (error) {
      await failOp(op, error);
      result.failed += 1;
      if (error && STOP_CODES.has(error.code)) throw error;
    }
  }
};

const sameCursor = (a, b) => a && b && a.seconds === b.seconds && a.nanoseconds === b.nanoseconds;

const pull = async (remote, deviceId, result) => {
  for (const collection of SYNCED_COLLECTIONS) {
    let cursor = (await readMeta(STATE, {})).cursors?.[collection] || null;
    for (;;) {
      const page = await remote.pull(collection, cursor);
      for (const doc of page.docs) {
        if (!isValidRemote(collection, doc.id, doc.data)) {
          result.rejected += 1;
          continue;
        }
        try {
          await transaction(tx => applyRemote(tx, collection, doc.id, doc.data, deviceId, result));
          result.pulled += 1;
        } catch {
          // e.g. an unreadable local record: leave it untouched and carry on
          result.failed += 1;
        }
      }
      if (page.next && !sameCursor(page.next, cursor)) {
        cursor = page.next;
        await saveCursor(collection, cursor);
      } else {
        break;
      }
      if (!page.more) break;
    }
  }
};

let running = null;

export const runSync = () => {
  if (!running) {
    running = doSync().finally(() => {
      running = null;
    });
  }
  return running;
};

const doSync = async () => {
  const gate = await getSyncGate();
  if (!gate.allowed) return {skipped: true, reasons: gate.reasons};

  const deviceId = await getDeviceId();
  const remote = require('./firestoreRemote').createFirestoreRemote(gate.uid, deviceId);
  const result = {skipped: false, pushed: 0, pulled: 0, conflicts: 0, failed: 0, rejected: 0, stopped: null};

  try {
    await push(remote, deviceId, result);
    await pull(remote, deviceId, result);
  } catch (error) {
    result.stopped = error && typeof error.code === 'string' ? error.code : 'unknown';
  }

  if (!result.stopped) {
    await transaction(async tx => {
      const state = await loadState(tx);
      await tx.writeMeta(STATE, {...state, lastSyncAt: nowISO()});
    });
  }
  return result;
};

export const getSyncStatus = async () => {
  const gate = await getSyncGate();
  const [ops, state, conflicts] = await Promise.all([
    listOutboxOps(),
    readMeta(STATE, {}),
    readMeta(CONFLICTS, []),
  ]);
  return {
    enabled: gate.allowed,
    reasons: gate.reasons,
    pending: ops.length,
    failing: ops.filter(op => op.attempts > 0).length,
    lastSyncAt: state?.lastSyncAt || null,
    conflicts: Array.isArray(conflicts) ? conflicts.length : 0,
  };
};

const REASON_TEXT = {
  'auth-disabled': 'Sign-in is turned off in this build.',
  'cloud-sync-disabled': 'Cloud sync is turned off in this build.',
  'rules-unverified': 'Cloud security rules have not been verified yet.',
  'no-verified-user': 'Sign in to sync.',
  'ownership-unclaimed': 'This device\u2019s data has not been linked to your account yet.',
  'ownership-mismatch': 'This device\u2019s data belongs to a different account.',
};

export const describeSyncStatus = status => {
  const pending = status.pending ? ` ${status.pending} change${status.pending === 1 ? '' : 's'} waiting.` : '';
  if (!status.enabled) {
    return `Saved on this device only. ${REASON_TEXT[status.reasons[0]] || 'Cloud sync is off.'}${pending}`;
  }
  return `Cloud sync is on.${pending}`;
};
