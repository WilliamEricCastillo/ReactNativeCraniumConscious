// Sync engine behaviour against an in-memory cloud that follows the same rules as firestoreRemote.js
// (revision-guarded writes, tombstone deletes, server-time cursors). No Firebase code runs.
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

jest.mock('../../../src/config/features', () => ({AUTH_ENABLED: true, CLOUD_SYNC_ENABLED: true, FIRESTORE_RULES_VERIFIED: true}));

const mockCloud = new Map();
const mockState = {uid: null, clock: 1000, fail: null};

jest.mock('../firestoreRemote', () => {
  const stamp = () => ({seconds: ++mockState.clock, nanoseconds: 0});
  return {
    getVerifiedUid: async () => mockState.uid,
    createFirestoreRemote: (uid, deviceId) => ({
      async push(collection, record, baseRev) {
        if (mockState.fail) throw Object.assign(new Error('x'), {code: mockState.fail});
        const key = `${uid}/${collection}/${record.id}`;
        const existing = mockCloud.get(key);
        if (existing && (baseRev == null || existing.rev !== baseRev)) return {status: 'conflict', remote: existing};
        mockCloud.set(key, {...JSON.parse(JSON.stringify(record)), deleted: false, deviceId, serverUpdatedAt: stamp()});
        return {status: 'ok'};
      },
      async pushDelete(collection, id, baseRev) {
        if (mockState.fail) throw Object.assign(new Error('x'), {code: mockState.fail});
        const key = `${uid}/${collection}/${id}`;
        const existing = mockCloud.get(key);
        if (existing && (baseRev == null || existing.rev !== baseRev)) return {status: 'conflict', remote: existing};
        const rev = (baseRev || 0) + 1;
        mockCloud.set(key, {id, deleted: true, deletedAt: 'now', updatedAt: 'now', rev, schemaVersion: 1, deviceId, serverUpdatedAt: stamp()});
        return {status: 'ok', rev};
      },
      async pull(collection, cursor) {
        const prefix = `${uid}/${collection}/`;
        const docs = [...mockCloud.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, data]) => ({id: key.slice(prefix.length), data}))
          .filter(d => !cursor || d.data.serverUpdatedAt.seconds >= cursor.seconds)
          .sort((a, b) => a.data.serverUpdatedAt.seconds - b.data.serverUpdatedAt.seconds);
        const last = docs.length ? docs[docs.length - 1].data.serverUpdatedAt : null;
        return {docs, next: last ? {...last} : null, more: false};
      },
    }),
  };
});

const DAY = '2026-01-05';

const openApp = () => {
  jest.resetModules();
  return {ds: require('../dataService'), store: require('../localStore'), engine: require('../syncEngine')};
};

const cloudKeys = uid => [...mockCloud.keys()].filter(k => k.startsWith(`${uid}/`));

// Signs in as `uid`, switches the local store to that account and links its data.
const signIn = async (store, ds, uid) => {
  mockState.uid = uid;
  await store.setActiveScope(uid);
  await ds.claimLocalData();
};

// Edits a cloud document the way another device would.
const editCloud = (uid, collection, id, changes) => {
  const key = `${uid}/${collection}/${id}`;
  const doc = mockCloud.get(key);
  mockCloud.set(key, {...doc, ...changes, rev: doc.rev + 1, deviceId: 'device_other', serverUpdatedAt: {seconds: ++mockState.clock, nanoseconds: 0}});
};

beforeEach(() => {
  mockStorage.clear();
  mockCloud.clear();
  mockState.uid = null;
  mockState.fail = null;
  jest.restoreAllMocks();
});

describe('gates', () => {
  test('nothing is sent until the user is signed in, owns the local data and has claimed it', async () => {
    const {ds, store} = openApp();
    await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'private'});

    expect(await ds.syncNow()).toMatchObject({skipped: true, reasons: ['no-verified-user']});

    mockState.uid = 'alice';
    expect(await ds.syncNow()).toMatchObject({skipped: true, reasons: ['ownership-mismatch']});

    await store.setActiveScope('alice');
    expect(await ds.syncNow()).toMatchObject({skipped: true, reasons: ['ownership-unclaimed']});
    expect(cloudKeys('alice')).toHaveLength(0);
  });

  test('claiming is refused while signed out or when the local data belongs to another account', async () => {
    const {ds, store} = openApp();
    await expect(ds.claimLocalData()).rejects.toMatchObject({reasons: ['no-verified-user']});
    mockState.uid = 'alice';
    await expect(ds.claimLocalData()).rejects.toMatchObject({reasons: ['ownership-mismatch']});
    await store.setActiveScope('alice');
    await ds.claimLocalData();
    mockState.uid = 'bob';
    await expect(ds.claimLocalData()).rejects.toMatchObject({reasons: ['ownership-mismatch']});
  });
});

describe('account isolation', () => {
  test('each account uploads to and downloads from its own path only', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'alice only'});
    await signIn(store, ds, 'alice');
    expect((await ds.syncNow()).pushed).toBeGreaterThan(0);
    expect(cloudKeys('alice').length).toBeGreaterThan(0);

    await store.setActiveScope('bob');
    mockState.uid = 'bob';
    expect(await ds.listJournalEntries()).toHaveLength(0);
    await ds.claimLocalData();
    await ds.syncNow();
    expect(await ds.listJournalEntries()).toHaveLength(0);
    expect(cloudKeys('bob')).toHaveLength(0);
  });

  test('a mismatch between the signed-in user and the local scope uploads nothing', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'mine'});
    mockState.uid = 'mallory';
    expect(await ds.syncNow()).toMatchObject({skipped: true, reasons: ['ownership-mismatch']});
    expect(mockCloud.size).toBe(0);
  });
});

describe('uploading, deleting and recovering', () => {
  test('local records upload once and later edits upload as a higher revision', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'v1'});
    await signIn(store, ds, 'alice');
    await ds.syncNow();
    expect(mockCloud.get(`alice/journalEntries/${entry.id}`)).toMatchObject({journal: 'v1', rev: 1, deleted: false});

    await ds.updateJournalEntry(entry.id, {journal: 'v2'});
    await ds.syncNow();
    expect(mockCloud.get(`alice/journalEntries/${entry.id}`)).toMatchObject({journal: 'v2', rev: 2});
    expect((await ds.getSyncStatus()).pending).toBe(0);
  });

  test('a delete leaves a tombstone without the text', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'secret'});
    await signIn(store, ds, 'alice');
    await ds.syncNow();
    await ds.deleteJournalEntry(entry.id);
    await ds.syncNow();
    const cloud = mockCloud.get(`alice/journalEntries/${entry.id}`);
    expect(cloud).toMatchObject({deleted: true});
    expect(JSON.stringify(cloud)).not.toContain('secret');
  });

  test('a delete made elsewhere removes the local copy', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'bye'});
    await signIn(store, ds, 'alice');
    await ds.syncNow();
    editCloud('alice', 'journalEntries', entry.id, {deleted: true, journal: undefined});
    await ds.syncNow();
    expect(await ds.getJournalEntry(entry.id)).toBeNull();
  });

  test('a reinstall recovers everything from the cloud', async () => {
    let {ds, store} = openApp();
    await store.setActiveScope('alice');
    await ds.createJournalEntry({date: DAY, moodValue: 4, journal: 'keep me'});
    await ds.saveDailyCheckIn({date: DAY, mood: 4});
    await ds.saveMetricEntry({metricId: 'sleep', date: DAY, value: 8});
    await signIn(store, ds, 'alice');
    await ds.syncNow();

    mockStorage.clear();
    ({ds, store} = openApp());
    await signIn(store, ds, 'alice');
    await ds.syncNow();
    expect((await ds.listJournalEntries()).map(e => e.journal)).toEqual(['keep me']);
    expect((await ds.getDaySnapshot(DAY)).sleepHours).toBe(8);
    expect((await ds.getDailyCheckIn(DAY)).mood).toBe(4);
  });
});

describe('offline behaviour and failures', () => {
  test('a failed upload keeps the data, backs off, and succeeds on a later run', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: 'offline'});
    await signIn(store, ds, 'alice');

    mockState.fail = 'unavailable';
    const failed = await ds.syncNow();
    expect(failed).toMatchObject({stopped: 'unavailable', failed: 1});
    expect(await ds.getJournalEntry(entry.id)).toMatchObject({journal: 'offline'});
    expect((await ds.getSyncStatus()).failing).toBe(1);

    mockState.fail = null;
    expect((await ds.syncNow()).pushed).toBe(0); // still backing off
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 2 * 3600000);
    expect((await ds.syncNow()).pushed).toBe(1);
    expect(mockCloud.has(`alice/journalEntries/${entry.id}`)).toBe(true);
  });

  test('invalid cloud documents are rejected, not stored', async () => {
    const {ds, store} = openApp();
    await signIn(store, ds, 'alice').catch(() => {});
    await store.setActiveScope('alice');
    await ds.claimLocalData();
    mockCloud.set('alice/journalEntries/bad', {id: 'bad', rev: 1, updatedAt: 'x', date: DAY, moodValue: 9, journal: 'nope', serverUpdatedAt: {seconds: 5, nanoseconds: 0}});
    const result = await ds.syncNow();
    expect(result.rejected).toBe(1);
    expect(await ds.getJournalEntry('bad')).toBeNull();
  });
});

describe('conflicts', () => {
  const setup = async content => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    const entry = await ds.createJournalEntry({date: DAY, moodValue: 3, journal: content});
    await signIn(store, ds, 'alice');
    await ds.syncNow();
    return {ds, store, entry};
  };

  test('journal entries edited on two devices are both kept', async () => {
    const {ds, entry} = await setup('original');
    editCloud('alice', 'journalEntries', entry.id, {journal: 'from the phone', updatedAt: '2026-02-01T00:00:00.000Z'});
    await ds.updateJournalEntry(entry.id, {journal: 'from the tablet'});
    const result = await ds.syncNow();
    expect(result.conflicts).toBe(1);

    const texts = (await ds.listJournalEntries()).map(e => e.journal).sort();
    expect(texts).toEqual(['from the phone', 'from the tablet']);
    const copy = (await ds.listJournalEntries()).find(e => e.source === 'conflict-copy');
    expect(copy).toMatchObject({journal: 'from the tablet', conflictOf: entry.id});

    await ds.syncNow();
    expect(mockCloud.get(`alice/journalEntries/${copy.id}`)).toMatchObject({journal: 'from the tablet'});
    expect(mockCloud.get(`alice/journalEntries/${entry.id}`).journal).toBe('from the phone');
  });

  test('identical edits on two devices are not a conflict', async () => {
    const {ds, entry} = await setup('original');
    editCloud('alice', 'journalEntries', entry.id, {journal: 'same words'});
    await ds.updateJournalEntry(entry.id, {journal: 'same words'});
    expect((await ds.syncNow()).conflicts).toBe(0);
    expect(await ds.listJournalEntries()).toHaveLength(1);
  });

  test('for other records the newest change wins and the older one is logged', async () => {
    const {ds, store} = openApp();
    await store.setActiveScope('alice');
    await ds.setGoalByTitle('Move every day', true);
    await signIn(store, ds, 'alice');
    await ds.syncNow();
    const goal = (await ds.listGoals())[0];

    editCloud('alice', 'goals', goal.id, {status: 'archived', updatedAt: '2999-01-01T00:00:00.000Z'});
    await ds.updateGoal(goal.id, {title: 'Move every day!'});
    await ds.syncNow();
    expect(await ds.listGoals()).toHaveLength(0); // the newer cloud change (archived) won

    const {ds: ds2} = await (async () => ({ds}))();
    expect((await ds2.listGoals({includeArchived: true}))[0].status).toBe('archived');
  });

  test('an edit beats a delete made on another device', async () => {
    const {ds, entry} = await setup('mine');
    editCloud('alice', 'journalEntries', entry.id, {deleted: true});
    await ds.updateJournalEntry(entry.id, {journal: 'mine, edited'});
    await ds.syncNow();
    expect(await ds.getJournalEntry(entry.id)).toMatchObject({journal: 'mine, edited'});
    await ds.syncNow();
    expect(mockCloud.get(`alice/journalEntries/${entry.id}`)).toMatchObject({deleted: false, journal: 'mine, edited'});
  });
});
