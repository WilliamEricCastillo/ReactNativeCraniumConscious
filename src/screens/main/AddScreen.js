import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {View, Alert, ActivityIndicator} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {UNSTABLE_usePreventRemove as usePreventRemove} from '@react-navigation/native';
import {Screen, Title, ListRow, SectionTitle, Note} from '../../components/ui';
import {getDaySnapshot, getPreferences, listCustomMetrics} from '../../../services/data/dataService';
import {WaterForm, SleepForm, ExerciseForm, MealForm, DefinedMetricForm, FreeMetricForm} from '../log/TrackingForms';
import {colors, metricColors, space} from '../../theme/theme';
import {todayISO, isValidISODate, formatWeekdayDate} from '../../utils/dates';
import {formatWater, describeCustomEntries} from '../../utils/format';

const NEW_METRIC = '__new_metric__';
const ACTIONS = [
  {id: 'water', title: 'Water', icon: 'water-outline', Form: WaterForm},
  {id: 'sleep', title: 'Sleep', icon: 'sleep', Form: SleepForm},
  {id: 'exercise', title: 'Exercise', icon: 'run', Form: ExerciseForm},
  {id: 'meal', title: 'Meals', icon: 'food-apple-outline', Form: MealForm},
];
const chosenDate = requested => isValidISODate(requested) && requested <= todayISO() ? requested : todayISO();
const load = async date => {
  const [snapshot, preferences, custom] = await Promise.all([getDaySnapshot(date), getPreferences(), listCustomMetrics()]);
  return {snapshot, preferences, custom};
};

const AddScreen = ({navigation, route}) => {
  const requestedDate = chosenDate(route?.params?.date);
  const target = route?.params?.expandedMetricId ?? null;
  const [date, setDate] = useState(requestedDate);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(target ? {[target]: true} : {});
  const [opened, setOpened] = useState(target ? {[target]: true} : {});
  const [statuses, setStatuses] = useState({});
  const state = useRef({});
  const scrollRef = useRef(null);
  const scrollTarget = useRef(target);
  const positions = useRef({});
  const alive = useRef(true);
  const revision = useRef(0);
  const [exitAction, setExitAction] = useState(null);
  const confirming = useRef(false);
  const accepted = useRef({date: requestedDate, target});
  const observed = useRef({date: requestedDate, target});
  const busy = () => Object.values(state.current).some(status => status.saving);
  const dirty = () => Object.values(state.current).some(status => status.dirty);
  const confirmDiscard = (proceed, cancel) => {
    if (confirming.current || busy()) return;
    confirming.current = true;
    Alert.alert('Discard unsaved changes?', 'Your pending tracking values have not been saved.', [
      {text: 'Keep editing', style: 'cancel', onPress: () => { confirming.current = false; cancel?.(); }},
      {text: 'Discard', style: 'destructive', onPress: () => {
        confirming.current = false;
        if (!busy()) proceed();
      }},
    ], {cancelable: false});
  };

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; revision.current += 1; };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({headerTitle: date === todayISO() ? 'Add to Today' : formatWeekdayDate(date), headerBackButtonMenuEnabled: false});
  }, [date, navigation]);

  useEffect(() => {
    let active = true;
    load(date).then(next => {
      if (active) { setData(next); setError(null); }
    }).catch(() => active && setError('Could not read saved data on this device.'));
    return () => { active = false; };
  }, [date]);

  const requestExit = action => {
    if (busy()) return;
    confirmDiscard(() => setExitAction(action));
  };
  usePreventRemove(!exitAction && Object.values(statuses).some(status => status.dirty || status.saving),
    ({data: eventData}) => requestExit(eventData.action));

  useEffect(() => {
    if (exitAction) navigation.dispatch(exitAction);
  }, [exitAction, navigation]);

  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (exitAction) return;
    if (!dirty() && !busy()) return;
    event.preventDefault();
    requestExit(event.data.action);
  }), [navigation, exitAction]);

  useEffect(() => {
    if (observed.current.date === requestedDate && observed.current.target === target) return;
    observed.current = {date: requestedDate, target};
    const apply = () => {
      if (date !== requestedDate) {
        revision.current += 1;
        state.current = {};
        setStatuses({});
        setOpened(target ? {[target]: true} : {});
        setData(null);
        setError(null);
        setDate(requestedDate);
      } else if (target) {
        setOpened(previous => ({...previous, [target]: true}));
      }
      setExpanded(target ? {[target]: true} : {});
      scrollTarget.current = target;
      accepted.current = {date: requestedDate, target};
    };
    const restore = () => {
      observed.current = accepted.current;
      navigation.setParams({date: accepted.current.date, expandedMetricId: accepted.current.target});
    };
    if (busy()) { restore(); return; }
    if (date !== requestedDate && dirty()) confirmDiscard(apply, restore);
    else apply();
  }, [requestedDate, target, date, navigation]);

  const report = (id, status) => {
    state.current = {...state.current, [id]: status};
    setStatuses(state.current);
  };
  const reset = id => {
    delete state.current[id];
    setStatuses({...state.current});
    setOpened(previous => { const next = {...previous}; delete next[id]; return next; });
    setExpanded(previous => ({...previous, [id]: false}));
  };
  const saved = (id, entry) => {
    reset(id);
    setData(previous => {
      const snapshot = {...previous.snapshot};
      if (entry.metricId === 'water') snapshot.waterGlasses = entry.value;
      else if (entry.metricId === 'sleep') snapshot.sleepHours = entry.value;
      else if (entry.metricId === 'exercise') {
        snapshot.exerciseMinutes = entry.value;
        snapshot.exerciseCategory = entry.category;
      } else if (entry.metricId === 'meal') snapshot.meals = [...snapshot.meals, entry];
      else snapshot.customEntries = [...snapshot.customEntries, entry];
      return {...previous, snapshot};
    });
    const currentRevision = ++revision.current;
    load(date).then(next => {
      if (!alive.current || revision.current !== currentRevision) return;
      setData(previous => ({...next, custom: [...next.custom,
        ...previous.custom.filter(metric => !next.custom.some(found => found.id === metric.id) && state.current[metric.id]?.dirty)]}));
      setError(null);
    }).catch(() => {
      if (alive.current && revision.current === currentRevision) {
        setError('Saved, but could not refresh saved data on this device.');
      }
    });
  };
  const toggle = id => {
    if (state.current[id]?.saving || confirming.current) return;
    if (!expanded[id]) {
      scrollTarget.current = id;
      setOpened(previous => ({...previous, [id]: true}));
    }
    setExpanded(previous => ({...previous, [id]: !previous[id]}));
  };
  const scrollToTarget = () => {
    const position = positions.current[scrollTarget.current];
    if (position == null) return;
    scrollRef.current?.scrollTo({y: position, animated: true});
    scrollTarget.current = null;
  };

  if (!data) return (
    <Screen scroll={false}>
      {error ? <Note>{error}</Note> : <ActivityIndicator color={colors.primary} size="large" />}
    </Screen>
  );

  const subtitle = id => {
    const snapshot = data.snapshot;
    if (id === 'water') return formatWater(snapshot.waterGlasses ?? 0, data.preferences.units.water);
    if (id === 'sleep') return snapshot.sleepHours == null ? 'Not logged' : `${snapshot.sleepHours} h`;
    if (id === 'exercise') return snapshot.exerciseMinutes == null ? 'Not logged' : `${snapshot.exerciseMinutes} min`;
    return `${snapshot.meals.length} logged`;
  };
  const section = ({id, title, icon, Form, metric, subtitle: description}) => (
    <View key={`${date}:${id}`} onLayout={event => {
      positions.current[id] = event.nativeEvent.layout.y;
      if (scrollTarget.current === id) scrollToTarget();
    }}>
      <ListRow title={title} subtitle={description} icon={icon} color={metricColors[id] || metricColors.custom}
        disabled={!!statuses[id]?.saving} expanded={!!expanded[id]} onPress={() => toggle(id)}
        right={<MaterialCommunityIcons name={expanded[id] ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />} />
      {opened[id] ? <View style={{display: expanded[id] ? 'flex' : 'none', paddingVertical: space.md}}
        testID={`tracking-form-${id}`} accessibilityElementsHidden={!expanded[id]}
        importantForAccessibility={expanded[id] ? 'auto' : 'no-hide-descendants'}>
        <Form snapshot={data.snapshot} preferences={data.preferences} metric={metric} date={date}
          onStateChange={status => report(id, status)} onSaved={entry => saved(id, entry)} onCancel={() => reset(id)} />
      </View> : null}
    </View>
  );
  return (
    <Screen scrollRef={scrollRef} onContentSizeChange={scrollToTarget}>
      <Title subtitle="Choose what to log">{date === todayISO() ? 'Add to Today' : `Add to ${formatWeekdayDate(date)}`}</Title>
      {error ? <Note>{error}</Note> : null}
      {ACTIONS.map(action => section({...action, subtitle: subtitle(action.id)}))}
      <SectionTitle title="Your metrics" />
      {data.custom.map(metric => section({id: metric.id, title: metric.name, icon: 'tune-variant', metric,
        Form: DefinedMetricForm, subtitle: describeCustomEntries(metric, data.snapshot.customEntries.filter(entry => entry.metricId === metric.id))}))}
      {target && !ACTIONS.some(action => action.id === target) && target !== NEW_METRIC && !data.custom.some(metric => metric.id === target)
        ? <Note>That metric no longer exists. Archived metrics cannot be logged.</Note> : null}
      {section({id: NEW_METRIC, title: 'Track something new', subtitle: 'Name it and log the first value', icon: 'plus-circle-outline', Form: FreeMetricForm})}
    </Screen>
  );
};

export default AddScreen;
