// Firebase login is available in development builds only; production releases remain auth-off.
export const AUTH_ENABLED = __DEV__;

// Cloud sync (services/data/syncEngine.js) only runs when ALL THREE flags are true, plus a verified user
// who has explicitly claimed this device's local data. Keep them false until the checklist in
// docs/data-schema.md is complete.
export const CLOUD_SYNC_ENABLED = false;

// Set to true only by a human after the Firestore rules in docs/data-schema.md are reviewed, deployed and tested.
export const FIRESTORE_RULES_VERIFIED = false;
