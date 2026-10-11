import React, {useEffect, useLayoutEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

import {Screen, Title, Card, Chip, Field, FormActions, ScaleSelector, RatingSlider, Stepper, Note} from '../../components/ui';
import {
  getDaySnapshot,
  getCustomMetric,
  getPreferences,
  saveDailyCheckIn,
  saveMetricEntry,
  logCustomMetricValue,
} from '../../../services/data/dataService';
import {DataValidationError, RATING_SCALE_1_10, ratingScaleFor, ratingSliderValue} from '../../../services/data/models';
import {todayISO, isValidISODate, formatWeekdayDate} from '../../utils/dates';
import {formatWater} from '../../utils/format';
import {colors, metricColors, moodOptions, space, MIN_TOUCH} from '../../theme/theme';

export const MoodPicker = ({value, onChange}) => (
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
          style={[styles.moodBtn, selected && styles.moodBtnSelected]}>
          {selected ? (
            <LinearGradient colors={['#E63BBE', colors.primary, colors.blue]} style={StyleSheet.absoluteFillObject} />
          ) : null}
          <Text style={styles.moodEmoji}>{o.emoji}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const StorageNote = () => <Note>Saved on this device only.</Note>;

const Block = ({label, children, card = false}) => {
  const content = (
    <>
      <Text style={styles.blockLabel}>{label}</Text>
      {children}
    </>
  );
  return card ? <Card style={styles.checkInBlock}>{content}</Card> : <View style={{marginBottom: space.xl}}>{content}</View>;
};

// Loads the chosen day's saved values (route.params.date, never in the future; defaults to today) once, then renders
// the form so its inputs start from what is stored.
const withToday = Form => {
  const Wrapped = props => {
    const [snapshot, setSnapshot] = useState(null);
    const [failed, setFailed] = useState(false);
    const requested = props.route?.params?.date;
    const today = todayISO();
    const date = isValidISODate(requested) && requested <= today ? requested : today;

    useLayoutEffect(() => {
      if (date !== today) props.navigation.setOptions({headerTitle: formatWeekdayDate(date)});
    }, [date, today, props.navigation]);

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
  const [energy, setEnergy] = useState(ratingSliderValue(saved?.energy, ratingScaleFor(saved, 'energy')));
  const [stress, setStress] = useState(ratingSliderValue(saved?.stress, ratingScaleFor(saved, 'stress')));
  const [focus, setFocus] = useState(ratingSliderValue(saved?.focus, ratingScaleFor(saved, 'focus')));
  const [changed, setChanged] = useState({});
  const [saving, run] = useSaver(navigation);
  const nothing = mood == null && energy == null && stress == null && focus == null;
  const select = (field, setter) => value => {
    setter(value);
    setChanged(previous => ({...previous, [field]: true}));
  };
  const saveCheckIn = () => {
    const values = {
      mood: changed.mood ? mood : saved?.mood ?? null,
      energy: changed.energy ? energy : saved?.energy ?? null,
      stress: changed.stress ? stress : saved?.stress ?? null,
      focus: changed.focus ? focus : saved?.focus ?? null,
    };
    const ratingScales = {...saved?.ratingScales};
    ['energy', 'stress', 'focus'].forEach(field => {
      if (changed[field]) ratingScales[field] = RATING_SCALE_1_10;
    });
    return saveDailyCheckIn({date, ...values, ...(Object.keys(ratingScales).length ? {ratingScales} : {})});
  };

  return (
    <Screen>
      <Title subtitle="A quick snapshot of how you are right now">Check-in</Title>
      <Block label="Mood" card>
        <MoodPicker value={mood} onChange={select('mood', setMood)} />
      </Block>
      <Block label="Energy" card>
        <RatingSlider label="Energy" value={energy} onChange={select('energy', setEnergy)} lowLabel="Drained" highLabel="Energized" />
      </Block>
      <Block label="Stress" card>
        <RatingSlider label="Stress" value={stress} onChange={select('stress', setStress)} lowLabel="Calm" highLabel="Overwhelmed" />
      </Block>
      <Block label="Focus" card>
        <RatingSlider label="Focus" value={focus} onChange={select('focus', setFocus)} lowLabel="Scattered" highLabel="Sharp" />
      </Block>
      {nothing ? <Text style={styles.error}>Select at least one value to save.</Text> : null}
      <StorageNote />
      <FormActions
        saveDisabled={nothing || saving}
        onCancel={() => navigation.goBack()}
        onSave={() => run(saveCheckIn)}
      />
    </Screen>
  );
});

const makeScaleScreen = ({key, title, subtitle, low, high}) =>
  withToday(({navigation, snapshot, date}) => {
    const isMood = key === 'mood';
    const originalValue = snapshot.checkIn?.[key] ?? null;
    const originalScale = ratingScaleFor(snapshot.checkIn, key);
    const [value, setValue] = useState(isMood ? originalValue : ratingSliderValue(originalValue, originalScale));
    const [changed, setChanged] = useState(false);
    const [saving, run] = useSaver(navigation);
    const select = next => {
      setValue(next);
      setChanged(true);
    };
    const save = () => saveDailyCheckIn({
      date,
      [key]: changed || isMood ? value : originalValue,
      ...(changed && !isMood ? {ratingScales: {[key]: RATING_SCALE_1_10}} : {}),
    });
    return (
      <Screen>
        <Title subtitle={subtitle}>{title}</Title>
        <Card>
          {key === 'mood' ? (
            <MoodPicker value={value} onChange={select} />
          ) : (
            <RatingSlider label={title} value={value} onChange={select} lowLabel={low} highLabel={high} />
          )}
        </Card>
        {value == null ? <Text style={styles.error}>Select a value to save.</Text> : null}
        <StorageNote />
        <FormActions
          saveDisabled={value == null || saving}
          onCancel={() => navigation.goBack()}
          onSave={() => run(save)}
        />
      </Screen>
    );
  });

export const MoodLogScreen = makeScaleScreen({key: 'mood', title: 'Mood', subtitle: 'How are you feeling?'});
export const EnergyLogScreen = makeScaleScreen({key: 'energy', title: 'Energy', subtitle: 'How energized do you feel?', low: 'Drained', high: 'Energized'});
export const StressLogScreen = makeScaleScreen({key: 'stress', title: 'Stress', subtitle: 'How stressed do you feel?', low: 'Calm', high: 'Overwhelmed'});
export const FocusLogScreen = makeScaleScreen({key: 'focus', title: 'Focus', subtitle: 'How well can you concentrate?', low: 'Scattered', high: 'Sharp'});

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
  const [unit, setUnit] = useState('glasses');
  const [saving, run] = useSaver(navigation);

  useEffect(() => {
    getPreferences()
      .then(p => setUnit(p.units.water))
      .catch(() => {});
  }, []);

  return (
    <Screen>
      <Title subtitle="Total glasses today (1 glass = 250 ml)">Water</Title>
      <Card>
        <Stepper value={glasses} onChange={setGlasses} step={1} min={0} max={40} unit="glasses" />
        {unit !== 'glasses' ? <Text style={styles.equiv}>{formatWater(glasses, unit)}</Text> : null}
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

// Logs a value for an existing metric (route.params.metricId), using the input that fits its type.
const DefinedMetricForm = ({metric, navigation, date}) => {
  const [value, setValue] = useState(metric.valueType === 'number' ? '' : null);
  const [saving, run] = useSaver(navigation);
  const numeric = typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value));
  const valid = metric.valueType === 'number' ? numeric : value != null;
  const amount = metric.valueType === 'number' ? Number(value) : value;

  return (
    <Screen>
      <Title subtitle={metric.unit ? `Unit: ${metric.unit}` : 'Log a value'}>{metric.name}</Title>
      {metric.valueType === 'number' ? (
        <Field label="Value" value={value} onChangeText={setValue} placeholder="e.g. 10" keyboardType="numeric" />
      ) : null}
      {metric.valueType === 'scale' ? (
        <Card>
          <ScaleSelector value={value} onChange={setValue} color={metricColors.custom} lowLabel="Low" highLabel="High" />
        </Card>
      ) : null}
      {metric.valueType === 'boolean' ? (
        <View style={styles.wrap}>
          <Chip label="Yes" selected={value === 1} onPress={() => setValue(1)} />
          <Chip label="No" selected={value === 0} onPress={() => setValue(0)} />
        </View>
      ) : null}
      {typeof value === 'string' && value !== '' && !numeric ? <Text style={styles.error}>Value must be a number.</Text> : null}
      <StorageNote />
      <FormActions
        saveDisabled={!valid || saving}
        onCancel={() => navigation.goBack()}
        onSave={() => run(() => saveMetricEntry({metricId: metric.id, date, value: amount}))}
      />
    </Screen>
  );
};

const FreeMetricForm = ({navigation, date}) => {
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
};

export const CustomMetricLogScreen = withToday(({navigation, route, date}) => {
  const metricId = route.params?.metricId;
  const [metric, setMetric] = useState(metricId ? 'loading' : null);

  useEffect(() => {
    if (!metricId) return undefined;
    let active = true;
    getCustomMetric(metricId)
      .then(found => active && setMetric(found && !found.archivedAt ? found : 'missing'))
      .catch(() => active && setMetric('missing'));
    return () => {
      active = false;
    };
  }, [metricId]);

  if (metric === 'loading') {
    return (
      <Screen scroll={false} contentStyle={{justifyContent: 'center'}}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }
  if (metric === 'missing') {
    return (
      <Screen>
        <Note>That metric no longer exists. Archived metrics cannot be logged.</Note>
      </Screen>
    );
  }
  return metric ? (
    <DefinedMetricForm metric={metric} navigation={navigation} date={date} />
  ) : (
    <FreeMetricForm navigation={navigation} date={date} />
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
    overflow: 'hidden',
  },
  moodBtnSelected: {backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 2, elevation: 4, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 8},
  moodEmoji: {fontSize: 26},
  blockLabel: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: space.sm},
  checkInBlock: {marginBottom: space.md},
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  error: {color: colors.red, fontSize: 13, marginBottom: space.sm},
  equiv: {color: colors.textMuted, textAlign: 'center', marginTop: space.sm, fontSize: 14},
});
