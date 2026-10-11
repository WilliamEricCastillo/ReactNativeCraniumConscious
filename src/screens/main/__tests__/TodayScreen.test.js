import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import TodayScreen from '../TodayScreen';
import useAsyncData from '../../../hooks/useAsyncData';
import {ROUTES} from '../../../navigation/routes';
import {todayISO} from '../../../utils/dates';

jest.mock('../../../hooks/useAsyncData', () => ({__esModule: true, default: jest.fn()}));

const data = tracked => ({
  today: todayISO(),
  snapshot: {waterGlasses: 2, sleepHours: 7, exerciseMinutes: 30, meals: [], customEntries: []},
  preferences: {trackedMetricIds: tracked, units: {water: 'glasses'}},
  customMetrics: [{id: 'reading', name: 'Reading', valueType: 'number', unit: 'pages'}],
  activeDates: [],
});

beforeEach(() => {
  jest.useFakeTimers();
  useAsyncData.mockReturnValue({data: data(['water', 'sleep', 'exercise', 'meal', 'reading']), error: false});
});
afterEach(() => { act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); });

test.each([
  ['Water: 2 glasses', 'water'],
  ['Sleep: 7 h', 'sleep'],
  ['Exercise: 30 min', 'exercise'],
  ['Meals: 0 logged', 'meal'],
  ['Reading: Not logged', 'reading'],
])('%s opens the existing Add route with date and stable expansion id', (label, id) => {
  const navigation = {navigate: jest.fn()};
  const screen = render(<TodayScreen navigation={navigation} />);
  fireEvent.press(screen.getByLabelText(label));
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.add, {date: todayISO(), expandedMetricId: id});
});

test('Browse all explicitly clears stale expansion; Check-in and preferences keep their routes', () => {
  const navigation = {navigate: jest.fn()};
  const screen = render(<TodayScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('Browse all tracking'));
  expect(navigation.navigate).toHaveBeenLastCalledWith(ROUTES.add, {date: todayISO(), expandedMetricId: null});
  fireEvent.press(screen.getByLabelText('Daily Check-in. Check in now'));
  expect(navigation.navigate).toHaveBeenLastCalledWith(ROUTES.checkIn, undefined);
  fireEvent.press(screen.getByText('Choose what appears here'));
  expect(navigation.navigate).toHaveBeenLastCalledWith(ROUTES.metrics, undefined);
});

test('Today still filters cards by tracking preferences and leaves separate Check-in visible', () => {
  useAsyncData.mockReturnValue({data: data(['water']), error: false});
  const screen = render(<TodayScreen navigation={{navigate: jest.fn()}} />);
  expect(screen.getByLabelText('Water: 2 glasses')).toBeTruthy();
  expect(screen.queryByLabelText('Sleep: 7 h')).toBeNull();
  expect(screen.queryByLabelText('Reading: Not logged')).toBeNull();
  expect(screen.getByLabelText('Daily Check-in. Check in now')).toBeTruthy();
});