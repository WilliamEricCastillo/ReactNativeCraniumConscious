import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render, waitFor, within} from '@testing-library/react-native';
import AddScreen from '../AddScreen';
import {UNSTABLE_usePreventRemove as usePreventRemove} from '@react-navigation/native';
import * as dataService from '../../../../services/data/dataService';
import {listMetricEntries, saveMetricEntry, createCustomMetric, listCustomMetrics, archiveCustomMetric, setMetricTracked} from '../../../../services/data/dataService';
import {Button, Screen, ListRow} from '../../../components/ui';
import {todayISO} from '../../../utils/dates';
import {WaterLogScreen, SleepLogScreen, ExerciseLogScreen, MealLogScreen, CustomMetricLogScreen} from '../../log/LogScreens';

const mockStorage = new Map();
jest.mock('@react-navigation/native', () => ({UNSTABLE_usePreventRemove: jest.fn()}));
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
const DATE = '2026-01-05';
const navigation = () => {
  const listeners = {};
  return {setOptions: jest.fn(), setParams: jest.fn(), dispatch: jest.fn(),
    addListener: jest.fn((name, handler) => { listeners[name] = handler; return () => { delete listeners[name]; }; }), listeners};
};
const open = async (params = {}, nav = navigation()) => {
  const screen = render(<AddScreen route={{params: {date: DATE, ...params}}} navigation={nav} />);
  await waitFor(() => expect(screen.getByText('Track something new')).toBeTruthy());
  return {...screen, nav};
};

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); jest.restoreAllMocks(); });

test('all collapsed, independently expand and retain pending values across toggles', async () => {
  const screen = await open();
  expect(screen.queryByText('Save')).toBeNull();
  expect(screen.queryByText('Check-in')).toBeNull();
  expect(screen.queryByText('Journal entry')).toBeNull();
  fireEvent.press(screen.getByLabelText('Water. 0 glasses'));
  fireEvent.press(screen.getByLabelText('Increase'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  fireEvent.changeText(screen.getByLabelText('Description'), 'Oats');
  fireEvent.press(screen.getByLabelText('Water. 0 glasses'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  expect(screen.queryByText('Save')).toBeNull();
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  expect(screen.getByLabelText('Description').props.value).toBe('Oats');
  fireEvent.press(screen.getByLabelText('Water. 0 glasses'));
  expect(within(screen.getByTestId('tracking-form-water')).getByText('1')).toBeTruthy();
  expect(await listMetricEntries()).toHaveLength(0);
});

test('successful save refreshes only its value and resets only its form', async () => {
  await saveMetricEntry({metricId: 'water', date: DATE, value: 4});
  const screen = await open({expandedMetricId: 'water'});
  fireEvent.press(screen.getByLabelText('Increase'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  fireEvent.changeText(screen.getByLabelText('Description'), 'Pending meal');
  fireEvent.press(within(screen.getByTestId('tracking-form-water')).getByText('Save'));
  await waitFor(() => expect(screen.getByLabelText('Water. 5 glasses')).toBeTruthy());
  expect(screen.queryByTestId('tracking-form-water')).toBeNull();
  expect(screen.getByLabelText('Description').props.value).toBe('Pending meal');
  fireEvent.press(screen.getByLabelText('Water. 5 glasses'));
  expect(within(screen.getByTestId('tracking-form-water')).getByText('5')).toBeTruthy();
  expect(await listMetricEntries({metricId: 'water'})).toHaveLength(1);
});

test('back confirms dirty collapsed drafts; cancel retains state and discard dispatches original action', async () => {
  const screen = await open({expandedMetricId: 'meal'});
  fireEvent.changeText(screen.getByLabelText('Description'), 'Pending');
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  const action = {type: 'GO_BACK', source: 'original'};
  const event = {preventDefault: jest.fn(), data: {action}};
  act(() => screen.nav.listeners.beforeRemove(event));
  expect(event.preventDefault).toHaveBeenCalled();
  act(() => Alert.alert.mock.calls[0][2][0].onPress());
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  expect(screen.getByLabelText('Description').props.value).toBe('Pending');
  act(() => screen.nav.listeners.beforeRemove(event));
  act(() => Alert.alert.mock.calls[1][2][1].onPress());
  expect(screen.nav.dispatch).toHaveBeenCalledWith(action);
  expect(await listMetricEntries()).toHaveLength(0);
});

test('custom stable id pre-expands even when not selected for Today', async () => {
  const metric = await createCustomMetric({name: 'Reading', track: false});
  const screen = await open({expandedMetricId: metric.id});
  expect(screen.getByLabelText('Value')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Value'), '12');
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(screen.getByLabelText('Reading. 12')).toBeTruthy());
  expect(await listMetricEntries({metricId: metric.id})).toHaveLength(1);
});

test('same-date route switching and explicit null collapse retain every pending draft', async () => {
  const screen = await open({expandedMetricId: 'meal'});
  fireEvent.changeText(screen.getByLabelText('Description'), 'Pending');
  screen.rerender(<AddScreen navigation={screen.nav} route={{params: {date: DATE, expandedMetricId: 'sleep'}}} />);
  expect(screen.queryByLabelText('Description')).toBeNull();
  fireEvent.press(screen.getByLabelText('Increase'));
  screen.rerender(<AddScreen navigation={screen.nav} route={{params: {date: DATE, expandedMetricId: null}}} />);
  expect(screen.queryByText('Save')).toBeNull();
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  expect(screen.getByLabelText('Description').props.value).toBe('Pending');
  fireEvent.press(screen.getByLabelText('Sleep. Not logged'));
  expect(within(screen.getByTestId('tracking-form-sleep')).getByText('7.5')).toBeTruthy();
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('cancel discards only its section and restores the saved baseline', async () => {
  await saveMetricEntry({metricId: 'water', date: DATE, value: 3});
  const screen = await open({expandedMetricId: 'water'});
  fireEvent.press(screen.getByLabelText('Increase'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  fireEvent.changeText(screen.getByLabelText('Description'), 'Keep meal');
  fireEvent.press(within(screen.getByTestId('tracking-form-water')).getByText('Cancel'));
  expect(screen.queryByTestId('tracking-form-water')).toBeNull();
  expect(screen.getByLabelText('Description').props.value).toBe('Keep meal');
  fireEvent.press(screen.getByLabelText('Water. 3 glasses'));
  expect(within(screen.getByTestId('tracking-form-water')).getByText('3')).toBeTruthy();
  expect((await listMetricEntries({metricId: 'water'}))[0].value).toBe(3);
});

test('save blocks duplicate, cancel, collapse and Back until completion; deliberate next save appends', async () => {
  const original = dataService.saveMetricEntry;
  let release;
  const spy = jest.spyOn(dataService, 'saveMetricEntry').mockImplementation(input =>
    new Promise(resolve => { release = () => resolve(original(input)); }));
  const screen = await open({expandedMetricId: 'meal'});
  fireEvent.changeText(screen.getByLabelText('Description'), 'Oats');
  const save = screen.UNSAFE_getAllByType(Button).find(button => button.props.title === 'Save').props.onPress;
  act(() => { save(); save(); });
  expect(spy).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', {name: 'Cancel'}).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByText('Cancel'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  const event = {preventDefault: jest.fn(), data: {action: {type: 'GO_BACK'}}};
  act(() => screen.nav.listeners.beforeRemove(event));
  expect(event.preventDefault).toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(screen.getByTestId('tracking-form-meal')).toBeTruthy();
  await act(async () => release());
  await waitFor(() => expect(screen.getByLabelText('Meals. 1 logged')).toBeTruthy());
  spy.mockRestore();
  fireEvent.press(screen.getByLabelText('Meals. 1 logged'));
  expect(screen.getByLabelText('Description').props.value).toBe('');
  fireEvent.changeText(screen.getByLabelText('Description'), 'Soup');
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(screen.getByLabelText('Meals. 2 logged')).toBeTruthy());
  expect((await listMetricEntries({metricId: 'meal'})).map(entry => entry.label)).toEqual(['Oats', 'Soup']);
});

test('storage failure retains all inputs and never automatically retries', async () => {
  const spy = jest.spyOn(dataService, 'saveMetricEntry').mockRejectedValue(new Error('disk'));
  const screen = await open({expandedMetricId: 'meal'});
  fireEvent.changeText(screen.getByLabelText('Description'), 'Pending meal');
  fireEvent.press(screen.getByText('Dinner'));
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(screen.getByLabelText('Description').props.value).toBe('Pending meal');
  expect(screen.getByRole('button', {name: 'Dinner'}).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  expect(screen.getByLabelText('Description').props.value).toBe('Pending meal');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(await listMetricEntries()).toHaveLength(0);
});

test('new metric creates once, refreshes list, and case-insensitive reuse appends without touching another draft', async () => {
  const screen = await open({expandedMetricId: 'meal'});
  fireEvent.changeText(screen.getByLabelText('Description'), 'Keep this');
  const newRow = 'Track something new. Name it and log the first value';
  fireEvent.press(screen.getByLabelText(newRow));
  const newForm = () => within(screen.getByTestId('tracking-form-__new_metric__'));
  fireEvent.changeText(newForm().getByLabelText('Metric name'), 'Reading');
  fireEvent.changeText(newForm().getByLabelText('Value'), '12');
  fireEvent.changeText(newForm().getByLabelText('Unit (optional)'), 'pages');
  fireEvent.press(newForm().getByText('Save'));
  await waitFor(() => expect(screen.getByLabelText('Reading. 12 pages')).toBeTruthy());
  expect(screen.getByLabelText('Description').props.value).toBe('Keep this');
  fireEvent.press(screen.getByLabelText(newRow));
  expect(newForm().getByLabelText('Metric name').props.value).toBe('');
  fireEvent.changeText(newForm().getByLabelText('Metric name'), ' reading ');
  fireEvent.changeText(newForm().getByLabelText('Value'), '5');
  fireEvent.press(newForm().getByText('Save'));
  await waitFor(() => expect(screen.getByLabelText('Reading. 5 pages (2 logs)')).toBeTruthy());
  expect(await listCustomMetrics()).toHaveLength(1);
  expect(await listMetricEntries()).toHaveLength(2);
});

test('archived definition cannot be written from an already opened draft', async () => {
  const metric = await createCustomMetric({name: 'Reading'});
  const screen = await open({expandedMetricId: metric.id});
  fireEvent.changeText(screen.getByLabelText('Value'), '12');
  await archiveCustomMetric(metric.id);
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(screen.getByLabelText('Value').props.value).toBe('12');
  expect(await listMetricEntries()).toHaveLength(0);
});

test('missing expanded custom target reports unavailable without a stale form', async () => {
  const screen = await open({expandedMetricId: 'missing'});
  expect(screen.getByText('That metric no longer exists. Archived metrics cannot be logged.')).toBeTruthy();
  expect(screen.queryByLabelText('Value')).toBeNull();
});

test('date change confirms discard, cancelling retains state and confirmed change writes only the new past date', async () => {
  const screen = await open({expandedMetricId: 'meal'});
  fireEvent.changeText(screen.getByLabelText('Description'), 'Keep me');
  const next = {date: '2026-01-04', expandedMetricId: 'meal'};
  screen.rerender(<AddScreen navigation={screen.nav} route={{params: next}} />);
  act(() => Alert.alert.mock.calls[0][2][0].onPress());
  expect(screen.getByLabelText('Description').props.value).toBe('Keep me');
  expect(screen.nav.setParams).toHaveBeenCalledWith({date: DATE, expandedMetricId: 'meal'});
  screen.rerender(<AddScreen navigation={screen.nav} route={{params: {date: DATE, expandedMetricId: 'meal'}}} />);
  screen.rerender(<AddScreen navigation={screen.nav} route={{params: next}} />);
  act(() => Alert.alert.mock.calls[1][2][1].onPress());
  await waitFor(() => expect(screen.getByLabelText('Description').props.value).toBe(''));
  fireEvent.changeText(screen.getByLabelText('Description'), 'Historical');
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(screen.getByLabelText('Meals. 1 logged')).toBeTruthy());
  expect(await listMetricEntries({date: DATE})).toHaveLength(0);
  expect((await listMetricEntries({date: next.date}))[0].label).toBe('Historical');
});

test('future date falls back to today and opening/collapsing does not change tracking preferences', async () => {
  await setMetricTracked('water', false);
  const original = await dataService.getPreferences();
  const screen = await open({date: '2999-01-01', expandedMetricId: 'water'});
  fireEvent.press(screen.getByLabelText('Water. 0 glasses'));
  expect(await dataService.getPreferences()).toEqual(original);
  expect(await listMetricEntries()).toHaveLength(0);
  fireEvent.press(screen.getByLabelText('Water. 0 glasses'));
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(screen.queryByTestId('tracking-form-water')).toBeNull());
  expect((await listMetricEntries())[0].date).toBe(todayISO());
});

test('native removal hook protects dirty drafts and releases before original dispatch', async () => {
  const screen = await open({expandedMetricId: 'meal'});
  expect(usePreventRemove.mock.calls.at(-1)[0]).toBe(false);
  fireEvent.changeText(screen.getByLabelText('Description'), 'Pending');
  const [blocked, callback] = usePreventRemove.mock.calls.at(-1);
  expect(blocked).toBe(true);
  const action = {type: 'POP', payload: {count: 1}};
  act(() => callback({data: {action}}));
  act(() => Alert.alert.mock.calls[0][2][1].onPress());
  expect(usePreventRemove.mock.calls.at(-1)[0]).toBe(false);
  expect(screen.nav.dispatch).toHaveBeenCalledWith(action);
  expect(screen.nav.setOptions).toHaveBeenCalledWith(expect.objectContaining({headerBackButtonMenuEnabled: false}));
});

test('expanded target scrolls only after its row has a measured position', async () => {
  const screen = await open({expandedMetricId: 'meal'});
  const scrollTo = jest.fn();
  screen.UNSAFE_getByType(Screen).props.scrollRef.current = {scrollTo};
  const row = screen.UNSAFE_getAllByType(ListRow).find(item => item.props.title === 'Meals');
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => row.parent.props.onLayout({nativeEvent: {layout: {y: 320}}}));
  expect(scrollTo).toHaveBeenCalledWith({y: 320, animated: true});
});

test.each([
  ['scale', 'Calm', '6', '3', 3],
  ['boolean', 'Read', '2', '0', 0],
])('Track something new reuses existing %s definitions and retains invalid input', async (valueType, name, invalid, valid, expected) => {
  const metric = await createCustomMetric({name, valueType});
  const screen = await open();
  fireEvent.press(screen.getByLabelText('Track something new. Name it and log the first value'));
  fireEvent.changeText(screen.getByLabelText('Metric name'), name.toLowerCase());
  fireEvent.changeText(screen.getByLabelText('Value'), invalid);
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(screen.getByLabelText('Value').props.value).toBe(invalid);
  expect(await listMetricEntries()).toHaveLength(0);
  fireEvent.changeText(screen.getByLabelText('Value'), valid);
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(screen.queryByTestId('tracking-form-__new_metric__')).toBeNull());
  expect(await listCustomMetrics()).toHaveLength(1);
  expect((await listMetricEntries())[0]).toMatchObject({metricId: metric.id, value: expected});
});

test('refresh failure after a committed save clears only the saved draft and does not retry the write', async () => {
  const screen = await open({expandedMetricId: 'water'});
  fireEvent.press(screen.getByLabelText('Increase'));
  fireEvent.press(screen.getByLabelText('Meals. 0 logged'));
  fireEvent.changeText(screen.getByLabelText('Description'), 'Retain me');
  jest.spyOn(dataService, 'getDaySnapshot').mockRejectedValue(new Error('read failure'));
  const write = jest.spyOn(dataService, 'saveMetricEntry');
  fireEvent.press(within(screen.getByTestId('tracking-form-water')).getByText('Save'));
  await waitFor(() => expect(screen.getByText('Saved, but could not refresh saved data on this device.')).toBeTruthy());
  expect(screen.getByLabelText('Water. 1 glass')).toBeTruthy();
  expect(screen.queryByTestId('tracking-form-water')).toBeNull();
  expect(screen.getByLabelText('Description').props.value).toBe('Retain me');
  expect(write).toHaveBeenCalledTimes(1);
  expect(await listMetricEntries()).toHaveLength(1);
});

test.each([
  [WaterLogScreen, 'water', null, 0],
  [SleepLogScreen, 'sleep', null, 7],
  [ExerciseLogScreen, 'exercise', null, 30],
  [MealLogScreen, 'meal', 'Description', 1],
  [CustomMetricLogScreen, 'new', 'Value', 12],
  [CustomMetricLogScreen, 'defined', 'Value', 12],
])('standalone %s saves to the explicit past date through the public API', async (Component, kind, input, expected) => {
  const metric = kind === 'defined' ? await createCustomMetric({name: 'Reading'}) : null;
  const nav = {...navigation(), goBack: jest.fn()};
  const screen = render(<Component navigation={nav} route={{params: {date: DATE, ...(metric ? {metricId: metric.id} : {})}}} />);
  await waitFor(() => expect(screen.getByText('Save')).toBeTruthy());
  if (kind === 'new') fireEvent.changeText(screen.getByLabelText('Metric name'), 'Reading');
  if (input) fireEvent.changeText(screen.getByLabelText(input), input === 'Description' ? 'Historical meal' : '12');
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(nav.goBack).toHaveBeenCalledTimes(1));
  const entries = await listMetricEntries({date: DATE});
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({date: DATE, value: expected});
  if (metric) expect(entries[0].metricId).toBe(metric.id);
});