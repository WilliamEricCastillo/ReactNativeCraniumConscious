import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {MealForm, WaterForm, SleepForm, ExerciseForm, DefinedMetricForm, FreeMetricForm} from '../TrackingForms';
import {Button, Stepper, ScaleSelector} from '../../../components/ui';
import {saveMetricEntry, logCustomMetricValue} from '../../../../services/data/dataService';
import {DataValidationError} from '../../../../services/data/models';

jest.mock('../../../../services/data/dataService', () => ({
  saveMetricEntry: jest.fn(), logCustomMetricValue: jest.fn(),
  getPreferences: jest.fn(async () => ({units: {water: 'glasses'}})),
}));

beforeEach(() => {
  jest.clearAllMocks();
  saveMetricEntry.mockReset();
  logCustomMetricValue.mockReset();
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); jest.restoreAllMocks(); });

test('water preserves the saved baseline and explicit historical date', async () => {
  const onSaved = jest.fn();
  const screen = render(<WaterForm snapshot={{waterGlasses: 4}} date="2026-01-01" onSaved={onSaved} />);
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(saveMetricEntry).toHaveBeenCalledWith({metricId: 'water', date: '2026-01-01', value: 4});
});

test('meal synchronously blocks duplicate save and cancel, and retains input after failure', async () => {
  let reject;
  saveMetricEntry.mockImplementation(() => new Promise((resolve, fail) => { reject = fail; }));
  const onCancel = jest.fn();
  const screen = render(<MealForm date="2026-01-01" onCancel={onCancel} />);
  fireEvent.changeText(screen.getByLabelText('Description'), 'Oats');
  const save = screen.UNSAFE_getAllByType(Button).find(button => button.props.title === 'Save').props.onPress;
  act(() => { save(); save(); });
  fireEvent.press(screen.getByText('Cancel'));
  expect(saveMetricEntry).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  await act(async () => reject(new Error('storage')));
  expect(screen.getByLabelText('Description').props.value).toBe('Oats');
  expect(Alert.alert).toHaveBeenCalledWith('Could not save', 'Something went wrong saving on this device.');
});

test.each([
  [WaterForm, 'water', {waterGlasses: 40}, 0, 40, 1, 'glasses'],
  [SleepForm, 'sleep', {sleepHours: 24}, 0, 24, 0.5, 'hours'],
  [ExerciseForm, 'exercise', {exerciseMinutes: 600}, 0, 600, 5, 'minutes'],
])('%s preserves stepper bounds and prevents movement above the maximum', async (Form, metricId, snapshot, min, max, step, unit) => {
  const screen = render(<Form snapshot={snapshot} date="2026-01-01" />);
  const stepper = screen.UNSAFE_getByType(Stepper);
  expect(stepper.props).toMatchObject({min, max, step, unit});
  fireEvent.press(screen.getByLabelText('Increase'));
  expect(screen.UNSAFE_getByType(Stepper).props.value).toBe(max);
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(saveMetricEntry).toHaveBeenCalledWith(expect.objectContaining({metricId, value: max, date: '2026-01-01'}));
});

test('exercise retains existing category and saves selected type with minutes', async () => {
  const screen = render(<ExerciseForm snapshot={{exerciseMinutes: 30, exerciseCategory: 'run'}} date="2026-01-01" />);
  expect(screen.getByRole('button', {name: 'Run'}).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByText('Yoga'));
  fireEvent.press(screen.getByLabelText('Increase'));
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(saveMetricEntry).toHaveBeenCalledWith({metricId: 'exercise', date: '2026-01-01', value: 35, category: 'yoga'});
});

test('meal requires a nonempty description and preserves label and category normalization', async () => {
  const screen = render(<MealForm date="2026-01-01" />);
  fireEvent.changeText(screen.getByLabelText('Description'), '  ');
  fireEvent.press(screen.getByText('Save'));
  expect(saveMetricEntry).not.toHaveBeenCalled();
  expect(screen.getByText('Describe the meal to save it.')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Description'), ' Soup ');
  fireEvent.press(screen.getByText('Lunch'));
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(saveMetricEntry).toHaveBeenCalledWith({metricId: 'meal', date: '2026-01-01', value: 1, label: 'Soup', category: 'lunch'});
});

test.each(['', '  ', 'abc', 'Infinity', '1e999'])('custom number rejects invalid input %j without writing', value => {
  const screen = render(<DefinedMetricForm metric={{id: 'metric', name: 'Reading', valueType: 'number'}} date="2026-01-01" />);
  fireEvent.changeText(screen.getByLabelText('Value'), value);
  fireEvent.press(screen.getByText('Save'));
  expect(saveMetricEntry).not.toHaveBeenCalled();
});

test('custom number saves a finite numeric value using its stable id', async () => {
  const screen = render(<DefinedMetricForm metric={{id: 'metric', name: 'Reading', valueType: 'number', unit: 'pages'}} date="2026-01-01" />);
  expect(screen.getByText('Unit: pages')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Value'), ' 12.5 ');
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(saveMetricEntry).toHaveBeenCalledWith({metricId: 'metric', date: '2026-01-01', value: 12.5});
});

test('scale requires a selection within 1-5 and retains it on validation failure', async () => {
  saveMetricEntry.mockRejectedValue(new DataValidationError('value', 'Invalid scale value.'));
  const screen = render(<DefinedMetricForm metric={{id: 'scale', name: 'Calm', valueType: 'scale'}} date="2026-01-01" />);
  fireEvent.press(screen.getByText('Save'));
  expect(saveMetricEntry).not.toHaveBeenCalled();
  act(() => screen.UNSAFE_getByType(ScaleSelector).props.onChange(6));
  fireEvent.press(screen.getByText('Save'));
  expect(saveMetricEntry).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('3 of 5'));
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(saveMetricEntry).toHaveBeenCalledWith({metricId: 'scale', date: '2026-01-01', value: 3});
  expect(screen.getByLabelText('3 of 5').props.accessibilityState.selected).toBe(true);
  expect(Alert.alert).toHaveBeenCalledWith('Could not save', 'Invalid scale value.');
});

test.each([['Yes', 1], ['No', 0]])('boolean %s saves %s; unselected input cannot save', async (label, value) => {
  const screen = render(<DefinedMetricForm metric={{id: 'boolean', name: 'Read', valueType: 'boolean'}} date="2026-01-01" />);
  fireEvent.press(screen.getByText('Save'));
  expect(saveMetricEntry).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText(label));
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(saveMetricEntry).toHaveBeenCalledWith({metricId: 'boolean', date: '2026-01-01', value});
});

test('new metric validates name and finite number, passes existing API payload, and retains failure draft', async () => {
  logCustomMetricValue.mockRejectedValue(new DataValidationError('name', 'Invalid metric name.'));
  const screen = render(<FreeMetricForm date="2026-01-01" />);
  fireEvent.changeText(screen.getByLabelText('Value'), '12');
  fireEvent.press(screen.getByText('Save'));
  expect(logCustomMetricValue).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Metric name'), 'Reading');
  fireEvent.changeText(screen.getByLabelText('Value'), 'Infinity');
  fireEvent.press(screen.getByText('Save'));
  expect(logCustomMetricValue).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Value'), '12');
  fireEvent.changeText(screen.getByLabelText('Unit (optional)'), ' pages ');
  fireEvent.press(screen.getByText('Save'));
  await act(async () => {});
  expect(logCustomMetricValue).toHaveBeenCalledWith({name: 'Reading', unit: 'pages', value: 12, date: '2026-01-01'});
  expect(screen.getByLabelText('Metric name').props.value).toBe('Reading');
  expect(screen.getByLabelText('Value').props.value).toBe('12');
});

test('new metric blocks rapid duplicate submissions synchronously', async () => {
  let finish;
  logCustomMetricValue.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const onSaved = jest.fn();
  const screen = render(<FreeMetricForm date="2026-01-01" onSaved={onSaved} />);
  fireEvent.changeText(screen.getByLabelText('Metric name'), 'Reading');
  fireEvent.changeText(screen.getByLabelText('Value'), '12');
  const save = screen.UNSAFE_getAllByType(Button).find(button => button.props.title === 'Save').props.onPress;
  act(() => { save(); save(); });
  expect(logCustomMetricValue).toHaveBeenCalledTimes(1);
  await act(async () => finish({id: 'saved'}));
  expect(onSaved).toHaveBeenCalledTimes(1);
});