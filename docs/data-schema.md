# Cranium Conscious data schema and sync design

Status: **local-first storage is active; Firestore sync is built, tested against an in-memory cloud, and disabled.** Nothing in the
app reads or writes Firestore today. Tests: `npm test` (data layer, sync engine, rules compatibility) and `npm run test:rules`
(Firestore rules against the local emulator; no live project is contacted).

## Local and cloud responsibilities

| | AsyncStorage (device) | Firebase Auth + Cloud Firestore |
| --- | --- | --- |
| Role | Persistent cache, offline support, and the only store while signed out | Permanent shared store for a signed-in user; cross-device sync |
| Ownership | Device scope while signed out / auth disabled; a separate key space per signed-in account | `users/{uid}/...`, `uid` = verified Firebase Auth uid |
| Works offline | Yes, always | No; changes queue locally and upload later |
| Status | **Active** | **Disabled** (`AUTH_ENABLED` is development-only; `CLOUD_SYNC_ENABLED` and `FIRESTORE_RULES_VERIFIED` remain `false` in `src/config/features.js`) |

Both are kept. Local data is never replaced by the cloud, and the cloud is never written without a verified user.

## Code map

| File | Purpose |
| --- | --- |
| `services/data/models.js` | JSDoc types, constants, validators, errors, defaults |
| `services/data/localStore.js` | Per-record AsyncStorage store, outbox, sync bookkeeping, one-time imports of earlier local data |
| `services/data/dataService.js` | The only API screens use (CRUD for every entity, atomic compound operations, drafts, sync status) |
| `services/data/syncEngine.js` | Gate checks, ownership claim, push, pull, conflict resolution, status |
| `services/data/firestoreRemote.js` | Firestore adapter (lazy-loaded; used only by the engine) |
| `services/data/cloudPaths.js` | Cloud path builders |
| `services/data/syncScheduler.js` | Triggers sync on foreground, local change, and a timer; registers nothing while gates are off |
| `services/data/legacyMapping.js`, `legacyAudit.js` | Pure legacy-to-new mapping; read-only audit of legacy cloud docs (never called automatically) |
| `services/localStorage.js` | Read-only access to the Phase 1 local key |

## Conventions

- IDs are generated on the device and are the document IDs, which makes uploads idempotent (no duplicates on retry):
  `<prefix>_<time><random>` (`journal_`, `cmetric_`, `mentry_`, `goal_`, `reminder_`); deterministic where one record per key is intended:
  `checkin_<date>`, `metric_<sleep|exercise|water>_<date>`; singletons `preferences` and `profile`.
  Imported records keep their original id, or `legacy_<date>_<hash>[_n]`, or `legacy_<firestoreDocId>`.
  Conflict copies: `<id>_conflict_<rev>_<device>`. IDs match `[A-Za-z0-9_.-]{1,200}`.
- Timestamps are ISO 8601 UTC strings (`createdAt`, `updatedAt`, `recordedAt`, `archivedAt`). `date` is a local calendar day `YYYY-MM-DD`.
- Every record has `schemaVersion` (1), `createdAt`, `updatedAt`, and `rev` (integer, +1 on every local change; used for conflict detection).
- Units are stored with every measurement. Journal mood, check-in mood, and custom `scale` metrics use 1-5. Check-in Energy, Stress, and Focus use 1-10 for newly changed values; absent `ratingScales` markers preserve the historical 1-5 interpretation.
- Never log record contents, tokens or Firestore error messages.

## Entities

Cloud paths are under `users/{uid}`. Local key: `@cranium-conscious/v3/rec/<collection>/<id>`.

| Entity | Collection / cloud path | Key fields |
| --- | --- | --- |
| Profile | `profile` / `users/{uid}` (the user doc itself) | `id: "profile"`, `displayName` or null. No email stored |
| Preferences | `settings` / `users/{uid}/settings/preferences` | `id: "preferences"`, `theme: "dark"`, `units {water: glasses|ml|oz, distance: km|mi}`, `weekStart`, `notifications {dailyReminders, weeklySummary}`, `trackedMetricIds[]` |
| Journal entries | `journalEntries` | `date`, `time` (`hh:mm a` string), `moodValue` 1-5 (5 excellent ... 1 very negative), `journal` (required, at most 50000 chars), optional `prompt`, `source` (`app`, `legacy-local`, `legacy-firestore`, `conflict-copy`), `legacyDocId`, `conflictOf` |
| Daily check-ins | `dailyCheckIns` | one per day (`checkin_<date>`): `mood` (1-5 or null), `energy`, `stress`, `focus` (1-5 legacy or 1-10 when marked, or null), `scale: "scale_1_5"`, optional `ratingScales` per-dimension markers. Saves merge per field (omitted keeps, null clears) |
| Custom metrics | `customMetrics` | `name` (unique among active, at most 60), `unit`, `valueType` (`number|scale|boolean`; fixed once values exist), `archivedAt` (archived, never hard-deleted) |
| Metric entries | `metricEntries` | `metricId`, `metricKind` (`builtin|custom`), `date`, `value`, `unit` (required), `recordedAt`, optional `label`, `category`, `note` |
| Goals | `goals` | `title` (unique among active), `metricId`, `target {value, unit, period}` or null, `status` |
| Reminders | `reminders` | `label`, `kind`, `time` (`HH:mm`), `daysOfWeek` (0 = Sunday), `enabled`. Stored only; nothing is scheduled |

Metrics: `sleep` (hours, max 24), `exercise` (minutes, max 1440, optional `category`), `water` (glasses, max 100) hold one record per day;
`meal` (1 per entry, `label` description, `category` meal type) and custom values append. **Mood, energy, stress and focus are stored on the daily
check-in only** (one source of truth, no duplicates) but are saved and read through the same metric functions (`saveMetricEntry`, `getMetricSeries`).
Custom values are validated against their definition (`scale` 1-5 integer, `boolean` 0/1).

### Mixed historical check-in scales

Each Energy, Stress, or Focus field in `ratingScales` may be marked `"scale_1_10"`. An absent marker means the stored raw value is historical 1-5. Mood always remains 1-5 (`scale: "scale_1_5"`). Opening a historical rating does not rewrite it; only moving its slider writes a 1-10 raw value and that dimension's marker. No local storage migration or bulk conversion is needed.

Analytics normalize unmarked values at read time only with `normalized = 1 + (raw - 1) * 9 / 4`; marked 1-10 values are used unchanged. Thus 1-5 maps to 1, 3.25, 5.5, 7.75, 10 on the common comparison scale, and stored history remains raw. Stress thresholds are compared on this scale: calm is at or below 3.25 (legacy 1-2 of 5, new 1-3 of 10); high stress is at or above 7.75 (legacy 4-5 of 5, new 8-10 of 10).

Device-only (never queued or uploaded): `drafts` (unsaved journal writing, so Back, a crash or a remount cannot lose it).

### Cloud-only fields

Added by the uploader, removed when pulled: `serverUpdatedAt` (server timestamp, the pull cursor), `deviceId`, `deleted`, `deletedAt`.
Deletes are stored as content-free tombstones (`{id, deleted: true, deletedAt, updatedAt, rev, deviceId, serverUpdatedAt}`) so other devices learn
of them and the text is not kept in the cloud.

## Local storage layout (AsyncStorage)

One key per record, so one large or damaged record cannot block the rest.

- `v3/rec/<collection>/<id>` the record
- `v3/outbox/<collection>/<id>` one pending change per record (the offline queue; coalesced)
- `v3/base/<collection>/<id>` revision last seen in the cloud
- `v3/meta/sync` device id, owner uid, claim time, per-collection pull cursors, last sync time; `v3/meta/conflicts` last 50 conflicts
- `v3/meta/upgrade/*` one-time import markers

Prefix: the paths above are the **device scope** (signed out, or `AUTH_ENABLED = false`, which is the default for local testing). Each signed-in account uses the same layout under
`@cranium-conscious/v3/u/<uid>/`; its key space starts empty and the one-time imports of earlier-version data run for the device scope only.

All mutations run one at a time through `transaction()`, and compound operations (find-or-create, toggles) run inside a single transaction,
so quick taps cannot create duplicates or lose updates.

**Unreadable data is never overwritten or deleted.** A record that fails to parse is left exactly where it is, skipped in lists, reported on the
Data screen, and any write to that id is refused.

### Upgrades (additive, one time, idempotent)

- Phase 2 single-key stores (`@cranium-conscious/v2/<collection>` maps) are copied into per-record keys; the old keys stay as backups.
- Phase 1 journal entries (`@cranium-conscious/journal-entries`) are imported once; identical entries without ids get a counter suffix instead of being merged.
  The legacy key is never modified. If it cannot be read, nothing is marked done and it is retried next launch. Invalid entries are skipped (reported) and remain only in the legacy key.

## Sync design (implemented, disabled)

### Gates (all required before any cloud access)
1. `AUTH_ENABLED`, `CLOUD_SYNC_ENABLED` and `FIRESTORE_RULES_VERIFIED` all `true`.
2. A current Firebase Auth user who can produce an ID token (verified identity; the client never supplies a uid or email as proof).
3. **Local scope matches the account**: the local store must be scoped to the same uid (`getActiveScope() === uid`, set by `AuthGate`), otherwise sync reports `ownership-mismatch`.
4. **Explicit claim**: `claimLocalData()` records this uid as the owner of the account's local key space and queues every unconfirmed record. It is never automatic, must be preceded by a user confirmation,
   and refuses if another uid already owns the data. Without a claim, sync reports `ownership-unclaimed` and does nothing.

### Offline queue (outbox)
Every local save or delete writes a pending change for that record (kept even while sync is off). Changes are coalesced per record; the record content is read
at upload time. A record the cloud has never seen needs no delete. Failed uploads back off exponentially (30 s doubling, max 1 h, with jitter) and only the
error code is stored. Network, auth and permission errors stop the run; other errors skip only that change. Changes made during an upload stay queued.

### Conflict detection and resolution
The cloud doc and each local record carry `rev`. Local remembers the cloud `rev` it last saw (`base`). An upload runs in a Firestore transaction and only writes
if the cloud `rev` equals that base (or the doc does not exist). Otherwise it is a conflict, resolved without losing data:

- Identical content: adopt the cloud copy, no conflict.
- **Journal entries: keep both.** The cloud version stays at that id; the local version is saved as a new record (`source: "conflict-copy"`, `conflictOf`), with a deterministic id so retries cannot duplicate it.
- Everything else: newest `updatedAt` wins (ties broken by device id); the replaced local version is kept in the local conflict log.
- An edit always beats a delete.

### Pull
Per collection, documents with `serverUpdatedAt >= cursor` (server time, so device clock skew cannot hide changes), in pages of 200 with a non-advancing-cursor guard. Applying is idempotent
and never touches a record with a pending local change except through conflict resolution. Remote documents are validated (id, `rev`, `updatedAt`, journal fields) and rejected if invalid.
Pulled writes are not queued again.

### Duplicate prevention
Device-generated ids are the document ids; deterministic ids for per-day records; uniqueness checks inside transactions for metric names, goal titles and reminder labels; deterministic conflict-copy ids.

## Security

### Rules and auth inspection
- **Rules are in the repo but not deployed:** `firestore.rules`, `firebase.json`, `firestore.indexes.json`. The proposed rules require verified ownership for account records and legacy `JournalEntries` reads; validate metadata, collection fields, built-in metric limits and custom metric definitions; preserve `createdAt` on updates; allow only content-free tombstones; and default-deny other paths. Tombstones may omit `createdAt` because the sync payload does so. Check-ins allow historical unmarked 1-5 ratings and marked 1-10 Energy, Stress and Focus; Mood remains 1-5.
  They were tested with `npm run test:rules` against the isolated local emulator (33 tests); `services/data/__tests__/rulesCompat.test.js` checks fields on saved app records. These tests do not verify deployed project rules or live connectivity.
  What the **live** project currently enforces is still **unverified**; no `.firebaserc` is committed so nothing can be deployed by accident.
- Auth flow (`src/screens/LoginScreen.js`, `src/auth/AuthGate.js`, `services/firebaseconfig.js`): email/password sign-in and sign-up, state via `onAuthStateChanged`, persistence through AsyncStorage.
  Done: visible, non-enumerating error messages, password length and confirmation checks, verification email on sign-up, password reset, themed screen, no console logging.
  Sync additionally requires a verified email (`getVerifiedUid`), and the rules require the same claim.
  Still open: the Firebase web API key is committed (not a secret by itself, but restrict it in the Firebase console); enable App Check before production.
  Imports: `services/firebaseconfig.js` takes `initializeApp`, auth and Firestore exclusively from the `firebase/*` entry points and tolerates a second evaluation (`auth/already-initialized`) during Fast Refresh.
- **Local data is isolated per account.** `AuthGate` unmounts the app while the signed-in user changes, switches the local store to that user's key space (`v3/u/<uid>/...`), and remounts the tree keyed by uid, so one account never sees another's data or screen state. Operations started under a previous account fail (`ScopeChangedError`) instead of writing into the new one. Signed-out / auth-disabled data stays in the device scope (the original keys) and is never shown to or merged into an account. **Not yet built:** moving device-scope data (for example Phase 1 entries) into an account, and an export/clear flow for it.
- **Claim and sync UI** exists on Data management, shown only when `AUTH_ENABLED` is true: account email, resend verification, "Link this phone's data" (with confirmation) and "Sync now".

### Historical rules sketch (not deployable; use `firestore.rules`)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }
    function validMeta() {
      return request.resource.data.id is string
        && request.resource.data.rev is int
        && request.resource.data.updatedAt is string
        && request.resource.data.serverUpdatedAt == request.time;
    }
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow create, update: if isOwner(uid) && validMeta();
      allow delete: if false; // deletions are tombstones
      match /{collection}/{docId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && validMeta() && request.resource.data.id == docId;
        allow update: if isOwner(uid) && validMeta() && request.resource.data.id == docId
          && request.resource.data.rev > resource.data.rev;
        allow delete: if false;
      }
    }
    // Legacy collection: no client writes; owners may read what they claim (queries must filter on userID).
    match /JournalEntries/{doc} {
      allow read: if request.auth != null && resource.data.userID == request.auth.uid;
      allow write: if false;
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```
The sketch above predates the current per-collection validators and verified-email checks. Do not deploy it.

## Legacy data

### `JournalEntries` (Cloud Firestore `(default)`)
Last client write found in this repository: `{userID, date, time, moodValue, journal}` with an auto-generated document id (`addDoc`); `userID` was supplied by the client.
Your audit reported `userName` on existing documents; no code here ever wrote it, so those came from an earlier client or manual edits. **Not verifiable from the repository:** document ids and counts, how many documents lack `userID`, and the live rules.

### Ownership
A legacy document is treated as **unclaimed** unless it has a `userID` equal to a verified uid. `userID` was written by the client, so it is a claim, not proof. Email or `userName` alone never assigns ownership.

### Safe migration plan (nothing is executed)
1. Do not delete, rename or overwrite `JournalEntries` documents at any point; keep it as a read-only archive.
2. Verify and publish ownership rules first (above).
3. Audit with admin tooling (outside the app): list document ids, count documents without `userID`, with only `userName`, with mismatched or duplicate `userID`/date/time/journal. Decide the unclaimed set with the owner(s).
4. `auditLegacyJournalEntries()` (read-only, counts only, gated) can then report, per signed-in user, how many of their documents map cleanly.
5. Map with `mapLegacyFirestoreDoc` (`id = legacy_<docId>`, `source = "legacy-firestore"`, `createdAt` approximated from date + time). Re-running is idempotent. Check `date + time + journal` against existing entries before creating.
6. Write into `users/{uid}/journalEntries` create-only, verify counts, keep the legacy documents.

## Audit findings addressed in this change

Single-key storage and corruption handling (replaced by per-record keys, unreadable data protected); legacy import hiding unreadable data; lost updates and duplicates from toggles and find-or-create
(now atomic, unique names/titles/labels); unsaved journal text loss (device-only drafts, plus the calendar modal no longer remounts); persisted meals and custom values invisible (now shown, removable with confirmation);
exercise type reset; unlogged water vs 0; read failures shown as empty (now explicit); calendar timezone (`America/Chicago`) vs local day; custom metric validation by type and locked type; unified metric ids (`meal`) with energy/stress/focus
exposed through the metric API; route parameter lookups (own-property only); create-only guards, stricter validation, text length limit; stale previous-day data on the Day screen.

## Go-live checklist (needs a human; nothing here has been done)

1. Review the complete `firestore.rules`, run `npm run test:rules`, then publish it yourself (Firebase console > Firestore > Rules, or `firebase deploy --only firestore:rules` from a machine where you are logged in). Confirm the target project before publishing and verify the deployed rules before any client writes. Do not deploy the historical sketch above.
2. Firebase console > Authentication > Sign-in method: keep Email/Password on; under Settings add a password policy (min length 8), and customise the verification and reset email templates.
3. Google Cloud console > APIs & Services > Credentials: restrict the web API key to the Android app (package + SHA-1) and the Identity Toolkit / Firestore APIs. Consider App Check (Play Integrity).
4. Audit the legacy `JournalEntries` collection with admin tooling (counts, documents without `userID`, duplicates) and decide the unclaimed set. Never delete it.
5. Create a test account with a real inbox and verify it. Auth is enabled automatically only in development builds. After manual rules deployment and verification, enable `CLOUD_SYNC_ENABLED` and `FIRESTORE_RULES_VERIFIED` **only in a dev build**, and exercise two devices: offline edits, conflicts, deletes, reinstall recovery. Explicitly claim local data only after reviewing the confirmation; claiming queues local records for upload.
6. Only then set `FIRESTORE_RULES_VERIFIED = true` in the release build.

## Still not built

Moving device-scope data into an account, export and delete-all, background sync while the app is closed, retention of conflict copies / conflict log / tombstones (never pruned), `schemaVersion` migrations beyond v1, a composite-index review for new queries, and migration of legacy Firestore `JournalEntries` (plan above, not executed).

## Feature status

| Feature | Storage |
| --- | --- |
| Journal entries, check-ins, metric entries, custom metrics, goals, reminders, preferences, profile | Local (AsyncStorage), queued for cloud |
| Unsaved journal drafts | Local only, never uploaded |
| Firestore reads and writes, claim, sync, legacy audit | Built, disabled, unexercised |
| Legacy `JournalEntries` migration | Not executed; plan above |
| Insights, trends, mood factors | Calculated from local records |
| Firebase login/logout | Preserved behind `AUTH_ENABLED`; unchanged |
