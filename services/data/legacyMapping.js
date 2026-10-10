import {parse, isValid, format} from 'date-fns';
import {isValidISODate} from '../../src/utils/dates';

export const LEGACY_FIRESTORE_COLLECTION = 'JournalEntries';

// Legacy entries only have a calendar date and a "hh:mm a" display time; this gives an approximate creation instant.
export const approximateTimestamp = (date, time) => {
  if (!isValidISODate(date)) return null;
  const base = parse(`${date} 12:00 PM`, 'yyyy-MM-dd hh:mm a', new Date());
  const parsed = typeof time === 'string' ? parse(`${date} ${time.trim()}`, 'yyyy-MM-dd hh:mm a', new Date()) : base;
  const when = isValid(parsed) ? parsed : base;
  return isValid(when) ? when.toISOString() : null;
};

export const hashText = text => {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/**
 * Pure mapping of one legacy Firestore document (collection `JournalEntries`) to the new JournalEntry shape.
 * No I/O. Not wired to any migration. Ownership is never inferred from the document itself:
 * `verifiedUid` must come from Firebase Authentication, and a legacy `userID` field is only a claim to compare.
 *
 * Returns {entry, issues}. `entry` is null when the document must not be migrated automatically.
 * Duplicate handling: the new id is derived from the legacy doc id, so re-running is idempotent.
 */
export const mapLegacyFirestoreDoc = (docId, data, verifiedUid) => {
  const issues = [];
  if (!verifiedUid) return {entry: null, issues: ['ownership-unverified: no authenticated user']};

  const claimedUid = typeof data?.userID === 'string' ? data.userID : null;
  if (!claimedUid) {
    // Documents with only a display name (userName) cannot be tied to a UID; needs an explicit user decision.
    return {entry: null, issues: ['unclaimed: no userID on document, requires manual ownership decision']};
  }
  if (claimedUid !== verifiedUid) return {entry: null, issues: ['not-owner: userID differs from verified uid']};

  if (!isValidISODate(data.date)) issues.push('invalid-date');
  if (!Number.isInteger(data.moodValue) || data.moodValue < 1 || data.moodValue > 5) issues.push('invalid-mood');
  if (typeof data.journal !== 'string' || data.journal.trim() === '') issues.push('empty-journal');
  if (issues.length) return {entry: null, issues};

  const createdAt = approximateTimestamp(data.date, data.time);
  return {
    issues,
    entry: {
      id: `legacy_${docId}`,
      date: data.date,
      time: typeof data.time === 'string' ? data.time : format(new Date(createdAt), 'hh:mm a'),
      moodValue: data.moodValue,
      journal: data.journal,
      source: 'legacy-firestore',
      legacyDocId: docId,
      schemaVersion: 1,
      createdAt,
      updatedAt: createdAt,
      rev: 1,
    },
  };
};
