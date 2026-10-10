const fs = require('fs');
const path = require('path');
const {initializeTestEnvironment, assertFails, assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp} = require('firebase/firestore');

let env;

const meta = (id, rev = 1) => ({
  id,
  schemaVersion: 1,
  createdAt: '2026-01-05T10:00:00.000Z',
  updatedAt: '2026-01-05T10:00:00.000Z',
  rev,
  deleted: false,
  deviceId: 'device_test',
  serverUpdatedAt: serverTimestamp(),
});

const DOCS = {
  journalEntries: id => ({...meta(id), date: '2026-01-05', time: '09:00 AM', moodValue: 4, journal: 'Hello', source: 'app'}),
  dailyCheckIns: id => ({...meta(id), date: '2026-01-05', mood: 4, energy: null, stress: 2, focus: null, scale: 'scale_1_5'}),
  customMetrics: id => ({...meta(id), name: 'Meditation', unit: 'minutes', valueType: 'number', archivedAt: null}),
  metricEntries: id => ({...meta(id), metricId: 'sleep', metricKind: 'builtin', date: '2026-01-05', value: 7.5, unit: 'hours', recordedAt: '2026-01-05T10:00:00.000Z'}),
  goals: id => ({...meta(id), title: 'Sleep 7+ hours', metricId: null, target: null, status: 'active'}),
  reminders: id => ({...meta(id), label: 'Morning check-in', kind: 'check-in', time: '09:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], enabled: true}),
};

const verified = (uid, claims = {}) => env.authenticatedContext(uid, {email: `${uid}@example.com`, email_verified: true, ...claims}).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cranium-conscious',
    firestore: {rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8')},
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

describe('account ownership', () => {
  test('signed-out users cannot read or write', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/alice/journalEntries/j1')));
    await assertFails(setDoc(doc(db, 'users/alice/journalEntries/j1'), DOCS.journalEntries('j1')));
  });

  test('the owner can create and read their own documents', async () => {
    const db = verified('alice');
    await assertSucceeds(setDoc(doc(db, 'users/alice/journalEntries/j1'), DOCS.journalEntries('j1')));
    await assertSucceeds(getDoc(doc(db, 'users/alice/journalEntries/j1')));
  });

  test('another user can neither read nor write someone else\'s data', async () => {
    await assertSucceeds(setDoc(doc(verified('alice'), 'users/alice/journalEntries/j1'), DOCS.journalEntries('j1')));
    const bob = verified('bob');
    await assertFails(getDoc(doc(bob, 'users/alice/journalEntries/j1')));
    await assertFails(setDoc(doc(bob, 'users/alice/journalEntries/j2'), DOCS.journalEntries('j2')));
    await assertFails(setDoc(doc(bob, 'users/alice'), {...meta('profile'), displayName: 'x'}));
  });

  test('an account without a verified email is denied', async () => {
    const db = env.authenticatedContext('alice', {email: 'a@example.com', email_verified: false}).firestore();
    await assertFails(setDoc(doc(db, 'users/alice/journalEntries/j1'), DOCS.journalEntries('j1')));
    await assertFails(getDoc(doc(db, 'users/alice/journalEntries/j1')));
  });
});

describe('every synced collection accepts a valid document and rejects bad ones', () => {
  test.each(Object.keys(DOCS))('%s: valid create is accepted', async collection => {
    await assertSucceeds(setDoc(doc(verified('alice'), `users/alice/${collection}/d1`), DOCS[collection]('d1')));
  });

  test('settings only accepts the preferences document', async () => {
    const prefs = {...meta('preferences'), theme: 'dark', units: {water: 'glasses'}, weekStart: 'monday', notifications: {}, trackedMetricIds: ['mood']};
    await assertSucceeds(setDoc(doc(verified('alice'), 'users/alice/settings/preferences'), prefs));
    await assertFails(setDoc(doc(verified('alice'), 'users/alice/settings/other'), {...prefs, id: 'other'}));
  });

  test('the profile document is the user document', async () => {
    await assertSucceeds(setDoc(doc(verified('alice'), 'users/alice'), {...meta('profile'), displayName: 'Alice'}));
    await assertFails(setDoc(doc(verified('alice'), 'users/alice'), {...meta('profile'), displayName: 'x'.repeat(81)}));
  });

  test('field validation', async () => {
    const db = verified('alice');
    const ref = id => doc(db, `users/alice/journalEntries/${id}`);
    await assertFails(setDoc(ref('a'), {...DOCS.journalEntries('a'), moodValue: 6}));
    await assertFails(setDoc(ref('b'), {...DOCS.journalEntries('b'), journal: ''}));
    await assertFails(setDoc(ref('c'), {...DOCS.journalEntries('c'), journal: 'x'.repeat(50001)}));
    await assertFails(setDoc(ref('d'), {...DOCS.journalEntries('d'), date: 'yesterday'}));
    await assertFails(setDoc(ref('e'), {...DOCS.journalEntries('e'), isAdmin: true}));
    await assertFails(setDoc(ref('f'), {...DOCS.journalEntries('f'), id: 'other'}));
    await assertFails(setDoc(ref('g'), {...DOCS.journalEntries('g'), serverUpdatedAt: Timestamp.now()}));
    await assertFails(setDoc(ref('h'), {...DOCS.journalEntries('h'), rev: 0}));
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r'), {...DOCS.reminders('r'), time: '25:00'}));
    await assertFails(setDoc(doc(db, 'users/alice/metricEntries/m'), {...DOCS.metricEntries('m'), value: -1}));
    await assertFails(setDoc(doc(db, 'users/alice/dailyCheckIns/c'), {...DOCS.dailyCheckIns('c'), mood: 9}));
  });

  test('unknown collections and unknown top-level paths are denied', async () => {
    const db = verified('alice');
    await assertFails(setDoc(doc(db, 'users/alice/secrets/s1'), {...meta('s1')}));
    await assertFails(setDoc(doc(db, 'admin/settings'), {a: 1}));
    await assertFails(getDoc(doc(db, 'admin/settings')));
  });
});

describe('revisions and deletes', () => {
  const path = 'users/alice/journalEntries/j1';

  test('an update must raise the revision', async () => {
    const db = verified('alice');
    await assertSucceeds(setDoc(doc(db, path), DOCS.journalEntries('j1')));
    await assertFails(setDoc(doc(db, path), {...DOCS.journalEntries('j1'), journal: 'same rev'}));
    await assertSucceeds(setDoc(doc(db, path), {...DOCS.journalEntries('j1'), journal: 'next', rev: 2}));
  });

  test('clients cannot hard-delete', async () => {
    const db = verified('alice');
    await assertSucceeds(setDoc(doc(db, path), DOCS.journalEntries('j1')));
    await assertFails(deleteDoc(doc(db, path)));
  });

  test.each(Object.keys(DOCS))('%s: a tombstone replaces a document', async collection => {
    const db = verified('alice');
    const ref = doc(db, `users/alice/${collection}/t1`);
    await assertSucceeds(setDoc(ref, DOCS[collection]('t1')));
    await assertSucceeds(setDoc(ref, {...meta('t1', 2), deleted: true, deletedAt: '2026-01-06T10:00:00.000Z'}));
  });

  test('a delete is a content-free tombstone with a higher revision', async () => {
    const db = verified('alice');
    await assertSucceeds(setDoc(doc(db, path), DOCS.journalEntries('j1')));
    const tombstone = {...meta('j1', 2), deleted: true, deletedAt: '2026-01-06T10:00:00.000Z'};
    await assertSucceeds(setDoc(doc(db, path), tombstone));
    await assertFails(setDoc(doc(db, path), {...tombstone, rev: 3, journal: 'secret text kept'}));
  });
});

describe('original JournalEntries collection', () => {
  const seed = async () =>
    env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'JournalEntries/old1'), {userID: 'alice', journal: 'old', moodValue: 3});
    });

  test('is readable only by the uid recorded on the document, and never writable', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(verified('alice'), 'JournalEntries/old1')));
    await assertFails(getDoc(doc(verified('bob'), 'JournalEntries/old1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'JournalEntries/old1')));
    await assertFails(setDoc(doc(verified('alice'), 'JournalEntries/old1'), {userID: 'alice', journal: 'changed'}));
    await assertFails(deleteDoc(doc(verified('alice'), 'JournalEntries/old1')));
  });
});
