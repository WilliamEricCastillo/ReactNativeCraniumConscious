import AsyncStorage from '@react-native-async-storage/async-storage';

// Phase 1 storage key. Read-only now: the data layer (services/data) imports these entries once and
// leaves this key untouched as a backup. Do not write new data here.
export const LEGACY_JOURNAL_ENTRIES_KEY = '@cranium-conscious/journal-entries';

// Throws when the stored value is not a JSON array, so the caller never mistakes unreadable data for "no data".
export const readLegacyJournalEntries = async () => {
  const stored = await AsyncStorage.getItem(LEGACY_JOURNAL_ENTRIES_KEY);
  if (!stored) return [];
  const parsed = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error('Legacy journal entries are not a list.');
  return parsed;
};
