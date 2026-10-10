import {AppState} from 'react-native';
import {AUTH_ENABLED, CLOUD_SYNC_ENABLED, FIRESTORE_RULES_VERIFIED} from '../../src/config/features';
import {onLocalChange} from './localStore';
import {runSync} from './syncEngine';

const INTERVAL_MS = 60000;
const DEBOUNCE_MS = 3000;

// Triggers runSync on foreground, after local changes, and on a slow timer (which also retries backed-off changes).
// With any gate flag off it registers nothing, so no listeners, timers or Firebase code exist in that case.
export const startSyncScheduler = () => {
  if (!AUTH_ENABLED || !CLOUD_SYNC_ENABLED || !FIRESTORE_RULES_VERIFIED) return () => {};

  const trigger = () => {
    runSync().catch(() => {});
  };
  let debounce = null;
  const unsubscribeChanges = onLocalChange(() => {
    clearTimeout(debounce);
    debounce = setTimeout(trigger, DEBOUNCE_MS);
  });
  const appState = AppState.addEventListener('change', state => {
    if (state === 'active') trigger();
  });
  const timer = setInterval(trigger, INTERVAL_MS);
  trigger();

  return () => {
    clearTimeout(debounce);
    clearInterval(timer);
    unsubscribeChanges();
    appState.remove();
  };
};
