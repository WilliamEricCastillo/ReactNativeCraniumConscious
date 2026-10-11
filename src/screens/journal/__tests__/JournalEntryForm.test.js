import React from 'react';
import {Alert} from 'react-native';
import {act, render, fireEvent, waitFor} from '@testing-library/react-native';
import JournalEntryForm from '../JournalEntryForm';
import {getDailyCheckIn, listJournalEntries, listMetricEntries, saveDailyCheckIn} from '../../../../services/data/dataService';

const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async key => mockStorage.get(key) ?? null,
    setItem: async (key, value) => { mockStorage.set(key, String(value)); },
    removeItem: async key => { mockStorage.delete(key); },
    getAllKeys: async () => [...mockStorage.keys()],
    multiGet: async keys => keys.map(key => [key, mockStorage.get(key) ?? null]),
    multiSet: async pairs => { pairs.forEach(([key, value]) => mockStorage.set(key, String(value))); },
  },
}));
jest.mock('react-native-calendars', () => ({Calendar: () => null}));

const DATE = '2026-01-05';

beforeEach(() => {
  mockStorage.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test.each([
  ['journal only', true, false, false],
  ['stats only', false, true, false],
  ['journal and stats with existing check-in', true, true, true],
])('%s never creates or modifies a daily Check-in', async (_, writeJournal, logWater, seedCheckIn) => {
  if (seedCheckIn) {
    await saveDailyCheckIn({date: DATE, mood: 3, energy: 4, stress: 2, focus: 5});
  }
  const originalCheckIn = await getDailyCheckIn(DATE);
  const onClose = jest.fn();
  const screen = render(<JournalEntryForm route={{params: {date: DATE}}} onClose={onClose} />);

  await act(async () => {});
  expect(screen.queryByLabelText('Check-in. Mood, energy, stress and focus')).toBeNull();

  if (writeJournal) {
    fireEvent.press(screen.getByLabelText('Open full-screen journal editor'));
    fireEvent.changeText(screen.getByLabelText('Journal entry'), 'Preserve this journal text');
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByLabelText('Mood Good'));
  }
  if (logWater) {
    fireEvent.press(screen.getByLabelText('Water. Glasses of water'));
    fireEvent.press(screen.getByLabelText('Increase'));
  }
  fireEvent.press(screen.getByText('Save entry'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

  expect(await getDailyCheckIn(DATE)).toEqual(originalCheckIn);
  const journals = await listJournalEntries({date: DATE});
  expect(journals).toHaveLength(writeJournal ? 1 : 0);
  if (writeJournal) expect(journals[0]).toMatchObject({journal: 'Preserve this journal text', moodValue: 4});
  const water = await listMetricEntries({date: DATE, metricId: 'water'});
  expect(water).toHaveLength(logWater ? 1 : 0);
  if (logWater) expect(water[0].value).toBe(1);
  screen.unmount();
});