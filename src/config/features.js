// Development switch: when false the app opens straight into the tabs and never loads Firebase auth.
// Set to true to restore the original Firebase login gate (see src/auth/AuthGate.js).
export const AUTH_ENABLED = false;

// Cloud sync (services/data/syncEngine.js) only runs when ALL THREE flags are true, plus a verified user
// who has explicitly claimed this device's local data. Keep them false until the checklist in
// docs/data-schema.md is complete.
export const CLOUD_SYNC_ENABLED = false;

// Set to true only by a human after the Firestore rules in docs/data-schema.md are reviewed, deployed and tested.
export const FIRESTORE_RULES_VERIFIED = false;
