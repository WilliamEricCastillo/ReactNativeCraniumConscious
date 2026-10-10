import {COLLECTIONS, SYNCED_COLLECTIONS, assertId} from './models';

// Cloud layout (see docs/data-schema.md). Every path starts with the verified Firebase Auth uid.
const assertUid = uid => {
  if (typeof uid !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(uid)) throw new Error('Invalid uid.');
};

const assertCollection = collection => {
  if (!SYNCED_COLLECTIONS.includes(collection)) throw new Error('Collection is not synced.');
};

export const cloudDocPath = (uid, collection, id) => {
  assertUid(uid);
  assertCollection(collection);
  assertId(id);
  return collection === COLLECTIONS.profile ? `users/${uid}` : `users/${uid}/${collection}/${id}`;
};

export const cloudCollectionPath = (uid, collection) => {
  assertUid(uid);
  assertCollection(collection);
  return `users/${uid}/${collection}`;
};
