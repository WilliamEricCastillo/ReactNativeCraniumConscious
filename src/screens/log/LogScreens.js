import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';

import {Screen, Title, Card, Chip, Field, FormActions, ScaleSelector, Stepper, Note} from '../../components/ui';
import {
  getDaySnapshot,
  saveDailyCheckIn,
  saveMetricEntry,
  logCustomMetricValue,
} from '../../../services/data/dataService';
import {DataValidationError} from '../../../services/data/models';
import {todayISO} from '../../utils/dates';
import {colors, metricColors, moodOptions, space, MIN_TOUCH} from '../../theme/theme';

const MoodPicker = ({value, onChange}) => (
  <View style={styles.moodRow}>
    {moodOptions.map(o => {
      const selected = value === o.value;
      return (
        <TouchableOpacity
          key={o.value}
          accessibilityRole="button"
          accessibilityLabel={`Mood ${o.label}`}
          accessibilityState={{selected}}
          onPress={() => onChange(o.value)}
          style={[styles.moodBtn, selected && {backgroundColor: o.color, borderColor: o.color}]}>
          <Text style={styles.moodEmoji}>{o.emoji}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const StorageNote = () => <Note>Saved on this device only.</Note>;

const Block = ({label, children}) => (
  <View style={{marginBottom: space.xl}}>
    <Text style={styles.blockLabel}>{label}</Text>
    {children}
  </View>
);

// Loads today's saved values once, then renders the form so its inputs start from what is stored.
const withToday = Form => {
  const Wrapped = props => {
    const [snapshot, setSnapshot] = useState(null);
    const [failed, setFailed] = useState(false);
    const date = todayISO();

    useEffect(() => {
      let active = true;
      getDaySnapshot(date)
        .then(s => active && setSnapshot(s))
        .catch(() => active && setFailed(true));
      return () => {
        active = false;
      };
    }, [date]);

    if (failed) {
      return (
        <Screen>
          <Note>Could not read saved data on this device.</Note>
        </Screen>
      );
    }
    if (!snapshot) {
      return (
        <Screen scroll={false} contentStyle={{justifyContent: 'center'}}>
          <ActivityIndicator color={colors.primary} size="large" />
        </Screen>
      );
    }
    return <Form {...props} snapshot={snapshot} date={date} />;
  };
  return Wrapped;
};

// Runs a save, then closes the screen; shows validation or storage problems without logging any values.
const useSaver = navigation => {
  const [saving, setSaving] = useState(false);
  const run = async task => {
    setSaving(true);
    try {
      await task();
      navigation.goBack();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        'Could not save',
        error instanceof DataValidationError ? error.message : 'Something went wrong saving on this device.',
      );
    }
  };
  return [saving, run];
};

export const CheckInScreen = withToday(({navigation, snapshot, date}) => {
  const saved = snapshot.checkIn;
  const [mood, setMood] = useState(saved?.mood ?? null);
  const [energy, setEnergy] = useState(saved?.energy ?? null);
  const [stress, setStress] = useState(saved?.stress ?? null);
  const [focus, setFocus] = useState(saved?.focus ?? null);
  const [saving, run] = useSaver(navigation);
  const nothing = mood == null && energy == null && stress == null && focus == null;

  return (
    <Screen>
      <Title subtitle="A quick snapshot of how you are right now">Check-in</Title>
      <Block label="Mood">
        <MoodPicker value={mood} onChange={setMood} />
      </Block>
      <Block label="Energy">
        <ScaleSelector value={energy} onChange={setEnergy} color={metricColors.energy} lowLabel="Drained" highLabel="Energized" />
      </Block>
      <Block label="Stress">
        <ScaleSelector value={stress} onChange={setStress} color={metricColors.stress} lowLabel="Calm" highLabel="Overwhelmed" />
      </Block>
      <Block label="Focus">
        <ScaleSelector value={focus} onChange={setFocus} color={metricColors.focus} lowLabel="Scattered" highLabel="Sharp" />
      </Block>
      {nothing ? <Text style={styles.error}>Select at least one value to save.</Text> : null}
      <StorageNote />
      <FormActions
        saveDisabled={nothing || saving}
        onCancel={() => navigation.goBack()}
        onSave={() => run(() => saveDailyCheckIn({date, mood, energy, stress, focus}))}
      />
    </Screen>
  );
});

const makeScaleScreen = ({key, title, subtitle, color, low, high}) =>
  withToday(({navigation, snapshot, date}) => {
    const [value, setValue] = useState(snapshot.checkIn?.[key] ?? null);
    const [saving, run] = useSaver(navigation);
    return (
      <Screen>
        <Title subtitle={subtitle}>{title}</Title>
        <Card>
          {key === 'mood' ? (
            <MoodPicker value={value} onChange={setValue} />
          ) : (
            <ScaleSelector value={value} onChange={setValue} color={color} lowLabel={low} highLabel={high} />
          )}
        </Card>
        {value == null ? <Text style={styles.error}>Select a value to save.</Text> : null}
        <StorageNote />
        <FormActions
          saveDisabled={value == null || saving}
          onCancel={() => navigation.goBack()}
          onSave={() => run(() => saveDailyCheckIn({date, [key]: value}))}
        />
      </Screen>
    );
  });

export const MoodLogScreen = makeScaleScreen({key: 'mood', title: 'Mood', subtitle: 'How are you feeling?', color: metricColors.mood});
export const EnergyLogScreen = makeScaleScreen({key: 'energy', title: 'Energy', subtitle: 'How energized do you feel?', color: metricColors.energy, low: 'Drained', high: 'Energized'});
export const StressLogScreen = makeScaleScreen({key: 'stress', title: 'Stress', subtitle: 'How stressed do you feel?', color: metricColors.stress, low: 'Calm', high: 'Overwhelmed'});
export const FocusLogScreen = makeScaleScreen({key: 'focus', title: 'Focus', subtitle: 'How well can you concentrate?', color: metricColors.focus, low: 'Scattered', high: 'Sharp'});

export const SleepLogScreen = withToday(({navigation, snapshot, date}) => {
  const [hours, setHours] = useState(snapshot.sleepHours ?? 7);
  const [saving, run] = useSaver(navigation);
  return (
    <Screen>
      <Title subtitle="How long did you sleep last night?">Sleep</Title>
      <Card>
        <Stepper value={hours} onChange={setHours} step={0.5} min={0} max={24} unit="hours" />
      </Card>
      <StorageNote />
      <FormActions
        saveDisabled={saving}
        onCancel={() => navigation.goBack()}
        onSave={() => run(() => saveMetricEntry({metricId: 'sleep', date, value: hours}))}
      />
    </Screen>
  );
});

const EXERCISE_TYPES = ['Walk', 'Run', 'Strength', 'Yoga', 'Other'];

export const ExerciseLogScreen = withToday(({navigation, snapshot, date}) => {
  const [minutes, setMinutes] = useState(snapshot.exerciseMinutes ?? 30);
  const [type, setType] = useState(
    EXERCISE_TYPES.find(t => t.toLowerCase() === snapshot.exerciseCategory) || 'Walk',
  );
  const [saving, run] = useSaver(navigation);
  return (
    <Screen>
      <Title subtitle="Movement of any kind counts">Exercise</Title>
      <Block label="Type">
        <View style={styles.wrap}>
          {EXERCISE_TYPES.map(t => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </Block>
      <Card>
        <Stepper value={minutes} onChange={setMinutes} step={5} min={0} max={600} unit="minutes" />
      </Card>
      <StorageNote />
      <FormActions
        saveDisabled={saving}
        onCancel={() => navigation.goBack()}
        onSave={() =>
          run(() => saveMetricEntry({metricId: 'exercise', date, value: minutes, category: type.toLowerCase()}))
        }
      />
    </Screen>
  );
});

export const WaterLogScreen = withToday(({navigation, snapshot, date}) => {
  const [glasses, setGlasses] = useState(snapshot.waterGlasses ?? 0);
  const [saving, run] = useSaver(navigation);
  return (
    <Screen>
      <Title subtitle="Total glasses today">Water</Title>
      <Card>
        <Stepper value={glasses} onChange={setGlasses} step={1} min={0} max={40} unit="glasses" />
      </Card>
      <StorageNote />
      <FormActions
        saveDisabled={saving}
        onCancel={() => navigation.goBack()}
        onSave={() => run(() => saveMetricEntry({metricId: 'water', date, value: glasses}))}
      />
    </Screen>
  );
});

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const MealLogScreen = withToday(({navigation, date}) => {
  const [type, setType] = useState('Breakfast');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, run] = useSaver(navigation);
  const invalid = name.trim() === '';

  return (
    <Screen>
      <Title subtitle="What did you eat?">Meal</Title>
      <Block label="Meal type">
        <View style={styles.wrap}>
          {MEAL_TYPES.map(t => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </Block>
      <Field
        label="Description"
        value={name}
        onChangeText={text => {
          setName(text);
          setTouched(true);
        }}
        placeholder="e.g. Oatmeal with berries"
      />
      {touched && invalid ? <Text style={styles.error}>Describe the meal to save it.</Text> : null}
      <StorageNote />
      <FormActions
        saveDisabled={invalid || saving}
        onCancel={() => navigation.goBack()}
        onSave={() =>
          run(() =>
            saveMetricEntry({metricId: 'meal', date, value: 1, label: name.trim(), category: type.toLowerCase()}),
          )
        }
      />
    </Screen>
  );
});

export const CustomMetricLogScreen = withToday(({navigation, date}) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [saving, run] = useSaver(navigation);
  const numeric = value.trim() !== '' && !Number.isNaN(Number(value));
  const valid = name.trim() !== '' && numeric;

  return (
    <Screen>
      <Title subtitle="Log a value for something you track">Custom metric</Title>
      <Field label="Metric name" value={name} onChangeText={setName} placeholder="e.g. Meditation" />
      <Field label="Value" value={value} onChangeText={setValue} placeholder="e.g. 10" keyboardType="numeric" />
      <Field label="Unit (optional)" value={unit} onChangeText={setUnit} placeholder="e.g. minutes" />
      {value !== '' && !numeric ? <Text style={styles.error}>Value must be a number.</Text> : null}
      <StorageNote />
      <FormActions
        saveDisabled={!valid || saving}
        onCancel={() => navigation.goBack()}
        onSave={() => run(() => logCustomMetricValue({name, unit: unit.trim(), value: Number(value), date}))}
      />
    </Screen>
  );
});

const styles = StyleSheet.create({
  moodRow: {flexDirection: 'row', justifyContent: 'space-between'},
  moodBtn: {
    flex: 1,
    height: 56,
    minWidth: MIN_TOUCH,
    marginHorizontal: 4,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {fontSize: 26},
  blockLabel: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: space.sm},
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  error: {color: colors.red, fontSize: 13, marginBottom: space.sm},
});
