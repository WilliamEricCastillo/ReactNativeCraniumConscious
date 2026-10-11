import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';
import {Title, Card, Chip, Field, FormActions, ScaleSelector, Stepper, Note} from '../../components/ui';
import {getPreferences, saveMetricEntry, logCustomMetricValue} from '../../../services/data/dataService';
import {DataValidationError} from '../../../services/data/models';
import {formatWater} from '../../utils/format';
import {colors, metricColors, space} from '../../theme/theme';

const useTrackingDraft = (initial, {onSaved, onCancel, onStateChange}) => {
  const baseline = useRef(initial);
  const current = useRef(initial);
  const inFlight = useRef(false);
  const callbacks = useRef({onSaved, onCancel, onStateChange});
  callbacks.current = {onSaved, onCancel, onStateChange};
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const report = () => callbacks.current.onStateChange?.({
    dirty: JSON.stringify(current.current) !== JSON.stringify(baseline.current),
    saving: inFlight.current,
  });
  const change = field => value => {
    if (inFlight.current) return;
    current.current = {...current.current, [field]: value};
    setDraft(current.current);
    report();
  };
  const cancel = () => {
    if (inFlight.current) return;
    current.current = baseline.current;
    setDraft(baseline.current);
    report();
    callbacks.current.onCancel?.();
  };
  const run = async task => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    report();
    let result;
    try {
      result = await task();
    } catch (error) {
      inFlight.current = false;
      setSaving(false);
      report();
      Alert.alert('Could not save', error instanceof DataValidationError
        ? error.message : 'Something went wrong saving on this device.');
      return;
    }
    baseline.current = current.current;
    inFlight.current = false;
    setSaving(false);
    report();
    callbacks.current.onSaved?.(result);
  };
  return {draft, change, saving, cancel, run};
};

const FormBody = ({children, form, valid = true, onSave}) => (
  <View>
    <View pointerEvents={form.saving ? 'none' : 'auto'} accessibilityElementsHidden={form.saving}
      importantForAccessibility={form.saving ? 'no-hide-descendants' : 'auto'}>
      {children}
    </View>
    <Note>Saved on this device only.</Note>
    <FormActions saveDisabled={!valid || form.saving} cancelDisabled={form.saving}
      onCancel={form.cancel} onSave={() => valid && form.run(onSave)} />
  </View>
);

const Block = ({label, children}) => (
  <View style={{marginBottom: space.xl}}>
    <Text style={styles.blockLabel}>{label}</Text>
    {children}
  </View>
);

export const SleepForm = ({snapshot, date, ...callbacks}) => {
  const form = useTrackingDraft({hours: snapshot.sleepHours ?? 7}, callbacks);
  return (
    <FormBody form={form} onSave={() => saveMetricEntry({metricId: 'sleep', date, value: form.draft.hours})}>
      <Title subtitle="How long did you sleep last night?">Sleep</Title>
      <Card><Stepper value={form.draft.hours} onChange={form.change('hours')} step={0.5} min={0} max={24} unit="hours" /></Card>
    </FormBody>
  );
};

const EXERCISE_TYPES = ['Walk', 'Run', 'Strength', 'Yoga', 'Other'];

export const ExerciseForm = ({snapshot, date, ...callbacks}) => {
  const form = useTrackingDraft({minutes: snapshot.exerciseMinutes ?? 30,
    type: EXERCISE_TYPES.find(type => type.toLowerCase() === snapshot.exerciseCategory) || 'Walk'}, callbacks);
  return (
    <FormBody form={form} onSave={() => saveMetricEntry({metricId: 'exercise', date,
      value: form.draft.minutes, category: form.draft.type.toLowerCase()})}>
      <Title subtitle="Movement of any kind counts">Exercise</Title>
      <Block label="Type"><View style={styles.wrap}>
        {EXERCISE_TYPES.map(type => <Chip key={type} label={type} selected={form.draft.type === type} onPress={() => form.change('type')(type)} />)}
      </View></Block>
      <Card><Stepper value={form.draft.minutes} onChange={form.change('minutes')} step={5} min={0} max={600} unit="minutes" /></Card>
    </FormBody>
  );
};

export const WaterForm = ({snapshot, date, preferences, ...callbacks}) => {
  const form = useTrackingDraft({glasses: snapshot.waterGlasses ?? 0}, callbacks);
  const [unit, setUnit] = useState(preferences?.units.water ?? 'glasses');
  useEffect(() => {
    if (preferences) return undefined;
    let active = true;
    getPreferences().then(saved => active && setUnit(saved.units.water)).catch(() => {});
    return () => { active = false; };
  }, [preferences]);
  return (
    <FormBody form={form} onSave={() => saveMetricEntry({metricId: 'water', date, value: form.draft.glasses})}>
      <Title subtitle="Total glasses today (1 glass = 250 ml)">Water</Title>
      <Card>
        <Stepper value={form.draft.glasses} onChange={form.change('glasses')} step={1} min={0} max={40} unit="glasses" />
        {unit !== 'glasses' ? <Text style={styles.equiv}>{formatWater(form.draft.glasses, unit)}</Text> : null}
      </Card>
    </FormBody>
  );
};

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const MealForm = ({date, ...callbacks}) => {
  const form = useTrackingDraft({type: 'Breakfast', name: ''}, callbacks);
  const [touched, setTouched] = useState(false);
  const invalid = form.draft.name.trim() === '';
  return (
    <FormBody form={form} valid={!invalid} onSave={() => saveMetricEntry({metricId: 'meal', date,
      value: 1, label: form.draft.name.trim(), category: form.draft.type.toLowerCase()})}>
      <Title subtitle="What did you eat?">Meal</Title>
      <Block label="Meal type"><View style={styles.wrap}>
        {MEAL_TYPES.map(type => <Chip key={type} label={type} selected={form.draft.type === type} onPress={() => form.change('type')(type)} />)}
      </View></Block>
      <Field label="Description" value={form.draft.name} onChangeText={text => {
        form.change('name')(text);
        setTouched(true);
      }} placeholder="e.g. Oatmeal with berries" />
      {touched && invalid ? <Text style={styles.error}>Describe the meal to save it.</Text> : null}
    </FormBody>
  );
};

export const DefinedMetricForm = ({metric, date, ...callbacks}) => {
  const form = useTrackingDraft({value: metric.valueType === 'number' ? '' : null}, callbacks);
  const {value} = form.draft;
  const numeric = typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
  const valid = metric.valueType === 'number' ? numeric
    : metric.valueType === 'scale' ? Number.isInteger(value) && value >= 1 && value <= 5
      : metric.valueType === 'boolean' && (value === 0 || value === 1);
  return (
    <FormBody form={form} valid={valid} onSave={() => saveMetricEntry({metricId: metric.id, date,
      value: metric.valueType === 'number' ? Number(value) : value})}>
      <Title subtitle={metric.unit ? `Unit: ${metric.unit}` : 'Log a value'}>{metric.name}</Title>
      {metric.valueType === 'number' ? <Field label="Value" value={value} onChangeText={form.change('value')} placeholder="e.g. 10" keyboardType="numeric" /> : null}
      {metric.valueType === 'scale' ? <Card><ScaleSelector value={value} onChange={form.change('value')} color={metricColors.custom} lowLabel="Low" highLabel="High" /></Card> : null}
      {metric.valueType === 'boolean' ? <View style={styles.wrap}>
        <Chip label="Yes" selected={value === 1} onPress={() => form.change('value')(1)} />
        <Chip label="No" selected={value === 0} onPress={() => form.change('value')(0)} />
      </View> : null}
      {typeof value === 'string' && value !== '' && !numeric ? <Text style={styles.error}>Value must be a number.</Text> : null}
    </FormBody>
  );
};

export const FreeMetricForm = ({date, ...callbacks}) => {
  const form = useTrackingDraft({name: '', value: '', unit: ''}, callbacks);
  const {name, value, unit} = form.draft;
  const numeric = value.trim() !== '' && Number.isFinite(Number(value));
  const valid = name.trim() !== '' && numeric;
  return (
    <FormBody form={form} valid={valid} onSave={() => logCustomMetricValue({name, unit: unit.trim(), value: Number(value), date})}>
      <Title subtitle="Log a value for something you track">Custom metric</Title>
      <Field label="Metric name" value={name} onChangeText={form.change('name')} placeholder="e.g. Meditation" />
      <Field label="Value" value={value} onChangeText={form.change('value')} placeholder="e.g. 10" keyboardType="numeric" />
      <Field label="Unit (optional)" value={unit} onChangeText={form.change('unit')} placeholder="e.g. minutes" />
      {value !== '' && !numeric ? <Text style={styles.error}>Value must be a number.</Text> : null}
    </FormBody>
  );
};

const styles = StyleSheet.create({
  blockLabel: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: space.sm},
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  error: {color: colors.red, fontSize: 13, marginBottom: space.sm},
  equiv: {color: colors.textMuted, textAlign: 'center', marginTop: space.sm, fontSize: 14},
});