import React, {useEffect, useLayoutEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

import {Screen, Title, Card, FormActions, RatingSlider, Note} from '../../components/ui';
import {WaterForm, SleepForm, ExerciseForm, MealForm, DefinedMetricForm, FreeMetricForm} from './TrackingForms';
import {
  getDaySnapshot,
  getCustomMetric,
  saveDailyCheckIn,
} from '../../../services/data/dataService';
import {DataValidationError, RATING_SCALE_1_10, ratingScaleFor, ratingSliderValue} from '../../../services/data/models';
import {todayISO, isValidISODate, formatWeekdayDate} from '../../utils/dates';
import {colors, moodOptions, space, MIN_TOUCH} from '../../theme/theme';

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

const trackingScreen = Form => withToday(({navigation, snapshot, date}) => (
  <Screen><Form snapshot={snapshot} date={date} onSaved={() => navigation.goBack()} onCancel={() => navigation.goBack()} /></Screen>
));

export const SleepLogScreen = trackingScreen(SleepForm);
export const ExerciseLogScreen = trackingScreen(ExerciseForm);
export const WaterLogScreen = trackingScreen(WaterForm);
export const MealLogScreen = trackingScreen(MealForm);

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
  return (
    <Screen>
      {metric ? (
        <DefinedMetricForm metric={metric} date={date} onSaved={() => navigation.goBack()} onCancel={() => navigation.goBack()} />
      ) : (
        <FreeMetricForm date={date} onSaved={() => navigation.goBack()} onCancel={() => navigation.goBack()} />
      )}
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
    overflow: 'hidden',
  },
  moodBtnSelected: {backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 2, elevation: 4, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 8},
  moodEmoji: {fontSize: 26},
  blockLabel: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: space.sm},
  checkInBlock: {marginBottom: space.md},
  error: {color: colors.red, fontSize: 13, marginBottom: space.sm},
});
