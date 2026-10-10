import AsyncStorage from '@react-native-async-storage/async-storage';

const JOURNAL_ENTRIES_KEY = '@cranium-conscious/journal-entries';

export const getJournalEntries = async () => {
  const storedEntries = await AsyncStorage.getItem(JOURNAL_ENTRIES_KEY);
  return storedEntries ? JSON.parse(storedEntries) : [];
};

export const saveJournalEntry = async entry => {
  const entries = await getJournalEntries();
  const updatedEntries = [...entries, entry];
  await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updatedEntries));
  return updatedEntries;
};