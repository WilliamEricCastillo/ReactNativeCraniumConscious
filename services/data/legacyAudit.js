import {COLLECTIONS} from './models';
import {listRecords} from './localStore';
import {LEGACY_FIRESTORE_COLLECTION, mapLegacyFirestoreDoc} from './legacyMapping';
import {SyncBlockedError} from './syncEngine';
import {AUTH_ENABLED, CLOUD_SYNC_ENABLED, FIRESTORE_RULES_VERIFIED} from '../../src/config/features';

const LIMIT = 500;

// READ-ONLY report on the signed-in user's legacy `JournalEntries` documents: counts only, no content, no writes.
// Not called anywhere; run it manually after the rules are verified. It can only see documents whose `userID`
// equals the verified uid, so unclaimed documents (no userID, or only userName) must be audited with
// admin tooling (see docs/data-schema.md).
export const auditLegacyJournalEntries = async () => {
  const blocked = [];
  if (!AUTH_ENABLED) blocked.push('auth-disabled');
  if (!CLOUD_SYNC_ENABLED) blocked.push('cloud-sync-disabled');
  if (!FIRESTORE_RULES_VERIFIED) blocked.push('rules-unverified');
  if (blocked.length) throw new SyncBlockedError(blocked);

  const uid = await require('./firestoreRemote').getVerifiedUid();
  if (!uid) throw new SyncBlockedError(['no-verified-user']);

  const f = require('firebase/firestore');
  const {db} = require('../firebaseconfig');
  const snapshot = await f.getDocs(
    f.query(f.collection(db, LEGACY_FIRESTORE_COLLECTION), f.where('userID', '==', uid), f.limit(LIMIT)),
  );

  const localIds = new Set((await listRecords(COLLECTIONS.journalEntries)).map(entry => entry.id));
  const report = {total: snapshot.size, truncated: snapshot.size === LIMIT, migratable: 0, alreadyPresent: 0, issues: {}};
  snapshot.docs.forEach(doc => {
    const {entry, issues} = mapLegacyFirestoreDoc(doc.id, doc.data(), uid);
    if (entry) {
      report.migratable += 1;
      if (localIds.has(entry.id)) report.alreadyPresent += 1;
    }
    issues.forEach(issue => {
      const key = issue.split(':')[0];
      report.issues[key] = (report.issues[key] || 0) + 1;
    });
  });
  return report;
};
