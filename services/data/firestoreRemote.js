import {COLLECTIONS, SCHEMA_VERSION, nowISO} from './models';
import {cloudDocPath, cloudCollectionPath} from './cloudPaths';

// The only module that talks to Firebase for sync. Firebase is required lazily and only after the gates in
// syncEngine.js pass, so with sync off nothing here is ever loaded. Never log documents or tokens.

const PAGE = 200;

const firestore = () => require('firebase/firestore');
const database = () => require('../firebaseconfig').db;

// A user counts as verified only if Firebase Auth has a current user with a verified email who can produce an ID
// token. The security rules require the same claim, so this fails early instead of on every write.
export const getVerifiedUid = async () => {
  const {auth} = require('../firebaseconfig');
  const user = auth.currentUser;
  if (!user || !user.uid) return null;
  try {
    if (!user.emailVerified) await user.reload();
    if (!user.emailVerified) return null;
    await user.getIdToken(true);
  } catch {
    return null;
  }
  return user.uid;
};

const plain = value => JSON.parse(JSON.stringify(value));

export const createFirestoreRemote = (uid, deviceId) => ({
  // Create-or-update guarded by revision: the write only happens if the cloud copy is the one we last saw.
  async push(collection, record, baseRev) {
    const f = firestore();
    const db = database();
    const ref = f.doc(db, cloudDocPath(uid, collection, record.id));
    return f.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists()) {
        const remote = snapshot.data();
        if (baseRev == null || remote.rev !== baseRev) return {status: 'conflict', remote};
      }
      transaction.set(ref, {
        ...plain(record),
        deleted: false,
        deviceId,
        serverUpdatedAt: f.serverTimestamp(),
      });
      return {status: 'ok'};
    });
  },

  // Deletes leave a content-free tombstone so other devices learn about them; the text is not kept in the cloud.
  async pushDelete(collection, id, baseRev) {
    const f = firestore();
    const db = database();
    const ref = f.doc(db, cloudDocPath(uid, collection, id));
    return f.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists()) {
        const remote = snapshot.data();
        if (baseRev == null || remote.rev !== baseRev) return {status: 'conflict', remote};
      }
      const now = nowISO();
      const rev = (baseRev || 0) + 1;
      transaction.set(ref, {
        id,
        deleted: true,
        deletedAt: now,
        updatedAt: now,
        rev,
        schemaVersion: SCHEMA_VERSION,
        deviceId,
        serverUpdatedAt: f.serverTimestamp(),
      });
      return {status: 'ok', rev};
    });
  },

  // Returns docs changed on the server since `cursor` (server time, so device clock skew cannot hide changes).
  async pull(collection, cursor) {
    const f = firestore();
    const db = database();

    if (collection === COLLECTIONS.profile) {
      const snapshot = await f.getDoc(f.doc(db, cloudDocPath(uid, collection, 'profile')));
      return {docs: snapshot.exists() ? [{id: 'profile', data: snapshot.data()}] : [], next: null, more: false};
    }

    const base = f.collection(db, cloudCollectionPath(uid, collection));
    const constraints = [f.orderBy('serverUpdatedAt'), f.limit(PAGE)];
    if (cursor) constraints.unshift(f.where('serverUpdatedAt', '>=', new f.Timestamp(cursor.seconds, cursor.nanoseconds)));
    const snapshot = await f.getDocs(f.query(base, ...constraints));

    const docs = snapshot.docs.map(d => ({id: d.id, data: d.data()}));
    const last = docs.length ? docs[docs.length - 1].data.serverUpdatedAt : null;
    const next = last && typeof last.seconds === 'number' ? {seconds: last.seconds, nanoseconds: last.nanoseconds} : null;
    return {docs, next, more: snapshot.size === PAGE};
  },
});
