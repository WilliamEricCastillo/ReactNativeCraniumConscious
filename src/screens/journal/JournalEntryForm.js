import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Keyboard,
  BackHandler,
  ImageBackground,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {format, parse, parseISO} from 'date-fns';
import {Calendar} from 'react-native-calendars';
import {Button, Card, Chip, Field, ScaleSelector, Stepper} from '../../components/ui';
import {
  saveJournalAndTracking,
  updateJournalEntry,
  getDaySnapshot,
  getPreferences,
  listCustomMetrics,
  getJournalDraft,
  saveJournalDraft,
  clearJournalDraft,
  journalDraftId,
} from '../../../services/data/dataService';
import {DataValidationError, MAX_JOURNAL_LENGTH} from '../../../services/data/models';
import {formatLongDate, todayISO} from '../../utils/dates';
import {formatWater} from '../../utils/format';
import {colors, metricColors, moodOptions, radius, space, MIN_TOUCH} from '../../theme/theme';

const editColors = {ink: '#151B3B', muted: '#566482', pink: '#E83EBD'};
const appBackground = require('../../assets/background04.png');
const EXERCISE_TYPES = ['Walk', 'Run', 'Strength', 'Yoga', 'Other'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const TrackingSection = ({title, description, icon, color, expanded, onToggle, disabled = false, children}) => (
  <Card style={styles.trackingCard}>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{expanded}}
      onPress={onToggle}
      disabled={disabled}
      style={styles.trackingSectionHeader}>
      <View style={[styles.trackingIconCircle, {backgroundColor: `${color}1A`}]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.trackingSectionCopy}>
        <Text style={styles.trackingSectionTitle}>{title}</Text>
        <Text style={styles.trackingSectionDescription}>{description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={23} color={colors.textMuted} />
    </TouchableOpacity>
    {expanded ? <View style={styles.trackingSectionBody}>{children}</View> : null}
  </Card>
);

const TrackingSections = ({
  expanded,
  toggle,
  values,
  setMetric,
  setMeal,
  meal,
  customMetrics,
  customValues,
  setCustomMetric,
  preferences,
  ready,
}) => (
  <View style={styles.trackingSections}>
    <TrackingSection title="Water" description="Glasses of water" icon="water-outline" color={metricColors.water} expanded={expanded.water} onToggle={() => toggle('water')} disabled={!ready}>
      <Stepper value={values.water} onChange={value => setMetric('water', {value})} unit="glasses" max={40} />
      {preferences?.units?.water && preferences.units.water !== 'glasses' ? (
        <Text style={styles.trackingEquiv}>{formatWater(values.water, preferences.units.water)}</Text>
      ) : null}
    </TrackingSection>

    <TrackingSection title="Sleep" description="Hours slept last night" icon="sleep" color={metricColors.sleep} expanded={expanded.sleep} onToggle={() => toggle('sleep')} disabled={!ready}>
      <Stepper value={values.sleep} onChange={value => setMetric('sleep', {value})} step={0.5} max={24} unit="hours" />
    </TrackingSection>

    <TrackingSection title="Exercise" description="Minutes of activity" icon="run" color={metricColors.exercise} expanded={expanded.exercise} onToggle={() => toggle('exercise')} disabled={!ready}>
      <Text style={styles.blockLabel}>Type</Text>
      <View style={styles.trackingChips}>
        {EXERCISE_TYPES.map(type => (
          <Chip key={type} label={type} selected={values.exerciseCategory === type} onPress={() => setMetric('exercise', {category: type})} />
        ))}
      </View>
      <Stepper value={values.exercise} onChange={value => setMetric('exercise', {value})} step={5} max={600} unit="minutes" />
    </TrackingSection>

    <TrackingSection title="Meals" description="What and when you ate" icon="food-apple-outline" color={metricColors.meal} expanded={expanded.meals} onToggle={() => toggle('meals')} disabled={!ready}>
      <View style={styles.trackingChips}>
        {MEAL_TYPES.map(type => (
          <Chip key={type} label={type} selected={meal.category === type.toLowerCase()} onPress={() => setMeal('category', type.toLowerCase())} />
        ))}
      </View>
      <Field label="Description" value={meal.label} onChangeText={value => setMeal('label', value)} placeholder="e.g. Oatmeal with berries" />
    </TrackingSection>

    <TrackingSection title="Custom metrics" description="Your personal measures" icon="chart-bar" color={metricColors.custom} expanded={expanded.custom} onToggle={() => toggle('custom')} disabled={!ready}>
      {customMetrics.length ? customMetrics.map(metric => (
        <View key={metric.id} style={styles.customMetricGroup}>
          <Text style={styles.trackingMetricTitle}>{metric.name}</Text>
          {metric.valueType === 'number' ? (
            <Field
              label={metric.unit ? `Value (${metric.unit})` : 'Value'}
              value={customValues[metric.id]?.text ?? ''}
              onChangeText={text => setCustomMetric(metric.id, {text})}
              placeholder="Optional"
              keyboardType="numeric"
            />
          ) : null}
          {metric.valueType === 'scale' ? (
            <ScaleSelector value={customValues[metric.id]?.value ?? null} onChange={value => setCustomMetric(metric.id, {value})} color={metricColors.custom} lowLabel="Low" highLabel="High" />
          ) : null}
          {metric.valueType === 'boolean' ? (
            <View style={styles.trackingChips}>
              <Chip label="Yes" selected={customValues[metric.id]?.value === 1} onPress={() => setCustomMetric(metric.id, {value: 1})} />
              <Chip label="No" selected={customValues[metric.id]?.value === 0} onPress={() => setCustomMetric(metric.id, {value: 0})} />
            </View>
          ) : null}
        </View>
      )) : <Text style={styles.trackingHint}>No custom metrics yet.</Text>}
    </TrackingSection>
  </View>
);

const Content = ({
  formattedDate,
  formattedTime,
  date,
  prompt,
  journalText,
  moodValue,
  handleInputChange,
  handleMoodSelection,
  handleSubmit,
  submitLabel,
  saving,
  notice,
  editMode,
  trackingProps,
  canSubmit,
  openWritingMode,
  onOpenDate,
  onOpenTime,
}) => (
  <>
    {editMode ? <View style={styles.editMetaRow}>
      <View style={[styles.metaRow, editMode && styles.editMetaCard]}>
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
        <View style={editMode && styles.editMetaTextGroup}>
          <Text style={[styles.label, editMode && styles.editLabel]}>Date: </Text>
          <Text style={[styles.metaText, editMode && styles.editMetaText]}>
            {formattedDate}
          </Text>
        </View>
      </View>
      <View style={[styles.metaRow, editMode && styles.editMetaCard]}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={editMode ? colors.blue : colors.primary} />
        <View style={editMode && styles.editMetaTextGroup}>
          <Text style={[styles.label, editMode && styles.editLabel]}>Time: </Text>
          <Text style={[styles.metaText, editMode && styles.editMetaText]}>{formattedTime}</Text>
        </View>
      </View>
    </View> : (
      <>
        <View style={styles.newMetaRow}>
          <Card onPress={onOpenDate} accessibilityLabel={`Date: ${formattedDate}`} style={styles.newMetaCard}>
            <MaterialCommunityIcons name="calendar-month-outline" size={24} color={colors.primary} />
            <View style={styles.newMetaTextGroup}>
              <Text style={styles.newMetaLabel}>Date</Text>
              <Text style={styles.newMetaValue}>{format(parseISO(date), 'MMM d, yyyy')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={23} color={colors.primaryDeep} />
          </Card>
          <Card onPress={onOpenTime} accessibilityLabel={`Time: ${formattedTime}`} style={styles.newMetaCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary} />
            <View style={styles.newMetaTextGroup}>
              <Text style={styles.newMetaLabel}>Time</Text>
              <Text style={styles.newMetaValue}>{formattedTime}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={23} color={colors.primaryDeep} />
          </Card>
        </View>
        <View style={styles.dateTimeNote}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
          <Text style={styles.dateTimeNoteText}>Past dates and times are okay. Future entries aren’t allowed.</Text>
        </View>
      </>
    )}

    {prompt ? (
      <View style={styles.promptCard}>
        <Text style={styles.promptKicker}>PROMPT</Text>
        <Text style={styles.promptText}>{prompt}</Text>
      </View>
    ) : null}

    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    {editMode ? (
      <TextInput
        style={[styles.input, styles.editInput]}
        textAlignVertical="top"
        multiline
        maxLength={MAX_JOURNAL_LENGTH}
        value={journalText}
        placeholder="Write your journal entry here..."
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Journal entry"
        onChangeText={handleInputChange}
      />
    ) : (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open full-screen journal editor"
        activeOpacity={1}
        onPress={openWritingMode}
        style={[styles.input, styles.inputLauncher]}>
        <Text style={[styles.inputLauncherText, !journalText && styles.inputLauncherPlaceholder]}>
          {journalText || 'Write your journal entry here...'}
        </Text>
      </TouchableOpacity>
    )}

    <View style={editMode ? styles.editMoodCard : styles.newMoodCard}>
      <Text style={[styles.feelingText, editMode && styles.editFeelingText]}>Mood:</Text>
      <View style={[styles.iconButtonContainer, editMode && styles.editIconButtonContainer]}>
        {moodOptions.map(option => {
          const selected = moodValue === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Mood ${option.label}`}
              accessibilityState={{selected}}
              style={[
                styles.iconButton,
                editMode && styles.editIconButton,
                selected && editMode && {backgroundColor: option.color, borderColor: option.color},
                selected && editMode && styles.editSelectedMood,
                selected && !editMode && styles.newSelectedMood,
                !selected && editMode && {backgroundColor: '#FFFFFF'},
              ]}
              onPress={() => handleMoodSelection(option.value)}>
              {selected && editMode ? (
                <LinearGradient colors={[colors.primary, editColors.pink]} style={StyleSheet.absoluteFillObject} />
              ) : null}
              <Text style={[styles.icon, editMode && styles.editIcon, !selected && {opacity: 0.75}]}>{option.emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.moodCaption, editMode && styles.editMoodCaption]}>
        {moodValue === 0
          ? 'Select how you feel'
          : moodOptions.find(m => m.value === moodValue)?.label}
      </Text>
    </View>
    {!editMode ? <TrackingSections {...trackingProps} /> : null}

    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.submitButton, editMode && styles.editSubmitButton, (!canSubmit || saving) && styles.submitButtonDisabled]}
      onPress={handleSubmit}
      disabled={!canSubmit || saving}>
      {editMode ? (
        <LinearGradient colors={[editColors.pink, colors.primary, colors.blue]} style={styles.editButtonGradient} />
      ) : null}
      <Text style={styles.submitButtonText}>{submitLabel}</Text>
    </TouchableOpacity>
  </>
);

// Existing journal-entry screen, restyled. Also used for prompt entries (`prompt`) and editing (`entry`).
const JournalEntryScreen = ({route, onClose, onWritingModeChange, prompt, entry}) => {
  const {date} = route.params;
  const [selectedDate, setSelectedDate] = useState(date);
  const activeDate = entry ? date : selectedDate;
  const formattedDate = formatLongDate(activeDate);

  const [moodValue, setMoodValue] = useState(entry ? entry.moodValue : 0);
  const [journalText, setJournalText] = useState(entry ? entry.journal : '');
  const [writingMode, setWritingMode] = useState(false);
  const [selection, setSelection] = useState(() => {
    const end = entry?.journal?.length ?? 0;
    return {start: end, end};
  });
  const writingInputRef = useRef(null);
  const [selectedTime, setSelectedTime] = useState(() => entry ? parse(entry.time, 'hh:mm a', new Date()) : new Date());
  const [timeTouched, setTimeTouched] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState(selectedDate);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pendingHour, setPendingHour] = useState('12');
  const [pendingMinute, setPendingMinute] = useState('00');
  const [pendingPeriod, setPendingPeriod] = useState('AM');
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [trackingReady, setTrackingReady] = useState(!!entry);
  const [trackingExpanded, setTrackingExpanded] = useState({});
  const [metricValues, setMetricValues] = useState({water: 0, sleep: 7, exercise: 30, exerciseCategory: 'Walk'});
  const [meal, setMeal] = useState({label: '', category: 'breakfast'});
  const [customMetrics, setCustomMetrics] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [trackingTouched, setTrackingTouched] = useState({metrics: {}});
  const [preferences, setPreferences] = useState(null);

  // Unsaved writing is kept on this device (never uploaded) so Back, a crash or a remount cannot lose it.
  const draftId = journalDraftId({date: activeDate, entryId: entry?.id, prompt});
  const latest = useRef({journalText: '', moodValue: 0});
  latest.current = {journalText, moodValue};
  const submitted = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    let active = true;
    getJournalDraft(draftId)
      .then(draft => {
        if (!active || !draft || typeof draft.journal !== 'string') return;
        setJournalText(draft.journal);
        const end = draft.journal.length;
        setSelection({start: end, end});
        if (draft.moodValue >= 1 && draft.moodValue <= 5) setMoodValue(draft.moodValue);
        setRestored(true);
      })
      .catch(() => {})
      .finally(() => active && setDraftLoaded(true));
    return () => {
      active = false;
    };
  }, [draftId]);

  useEffect(() => {
    if (entry) return undefined;
    let active = true;
    setTrackingReady(false);
    Promise.all([getDaySnapshot(activeDate), getPreferences(), listCustomMetrics()])
      .then(([snapshot, prefs, metrics]) => {
        if (!active) return;
        setMetricValues(previous => ({
          water: trackingTouched.metrics.water ? previous.water : snapshot.waterGlasses ?? 0,
          sleep: trackingTouched.metrics.sleep ? previous.sleep : snapshot.sleepHours ?? 7,
          exercise: trackingTouched.metrics.exercise ? previous.exercise : snapshot.exerciseMinutes ?? 30,
          exerciseCategory: trackingTouched.metrics.exercise
            ? previous.exerciseCategory
            : snapshot.exerciseCategory
              ? `${snapshot.exerciseCategory[0].toUpperCase()}${snapshot.exerciseCategory.slice(1)}`
              : 'Walk',
        }));
        setCustomMetrics(metrics);
        setPreferences(prefs);
        setTrackingReady(true);
      })
      .catch(() => {
        if (!active) return;
        Alert.alert('Could not load tracking data', 'Your journal entry can still be saved.');
      });
    return () => {
      active = false;
    };
  }, [activeDate, entry]);

  const persistDraft = useCallback(() => {
    if (submitted.current || !dirty.current) return;
    dirty.current = false;
    const {journalText: text, moodValue: mood} = latest.current;
    const unchanged = entry ? text === entry.journal && mood === entry.moodValue : text.trim() === '' && mood === 0;
    const task = unchanged ? clearJournalDraft(draftId) : saveJournalDraft(draftId, {journal: text, moodValue: mood});
    task.catch(() => {});
  }, [draftId, entry]);

  useEffect(() => {
    if (!draftLoaded) return undefined;
    dirty.current = true;
    const timer = setTimeout(persistDraft, 700);
    return () => clearTimeout(timer);
  }, [journalText, moodValue, draftLoaded, persistDraft]);

  useEffect(() => () => persistDraft(), [persistDraft]);
  useEffect(() => {
    if (entry || timeTouched) {
      return undefined;
    }
    const interval = setInterval(() => {
      setSelectedTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [entry, timeTouched]);

  const openTimePicker = () => {
    setPendingHour(format(selectedTime, 'h'));
    setPendingMinute(format(selectedTime, 'mm'));
    setPendingPeriod(format(selectedTime, 'a'));
    setTimePickerOpen(true);
  };

  const confirmTime = () => {
    const hour = Number(pendingHour) % 12 + (pendingPeriod === 'PM' ? 12 : 0);
    const candidate = new Date(selectedTime);
    candidate.setHours(hour, Number(pendingMinute), 0, 0);
    if (activeDate === todayISO() && candidate > new Date()) {
      Alert.alert('Future time unavailable', 'Choose a time that has already passed.');
      return;
    }
    setSelectedTime(candidate);
    setTimeTouched(true);
    setTimePickerOpen(false);
  };

  const confirmDate = () => {
    if (pendingDate > todayISO()) return;
    setSelectedDate(pendingDate);
    if (pendingDate === todayISO() && selectedTime > new Date()) setSelectedTime(new Date());
    setDatePickerOpen(false);
  };

  const handleMoodSelection = value => {
    setMoodValue(value);
  };

  const handleInputChange = text => {
    setJournalText(text);
  };

  const openWritingMode = () => {
    setWritingMode(true);
    onWritingModeChange?.(true);
  };

  const closeWritingMode = () => {
    Keyboard.dismiss();
    setWritingMode(false);
    onWritingModeChange?.(false);
  };

  useEffect(() => {
    if (!writingMode) return undefined;
    const focusTimer = setTimeout(() => writingInputRef.current?.focus(), 100);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeWritingMode();
      return true;
    });
    return () => {
      clearTimeout(focusTimer);
      backHandler.remove();
    };
  }, [writingMode]);

  const setMetricValue = (metric, patch) => {
    if (metric === 'exercise' && patch.category) {
      setMetricValues(previous => ({...previous, exerciseCategory: patch.category}));
    } else {
      setMetricValues(previous => ({...previous, [metric]: patch.value}));
    }
    setTrackingTouched(previous => ({...previous, metrics: {...previous.metrics, [metric]: true}}));
  };

  const setMealValue = (field, value) => setMeal(previous => ({...previous, [field]: value}));
  const setCustomMetricValue = (metricId, patch) => {
    setCustomValues(previous => ({...previous, [metricId]: {...previous[metricId], ...patch}}));
  };
  const toggleTrackingSection = key => setTrackingExpanded(previous => ({...previous, [key]: !previous[key]}));

  const customMetricsToSave = customMetrics.flatMap(metric => {
    const current = customValues[metric.id];
    if (!current) return [];
    if (metric.valueType === 'number') {
      if (current.text == null || current.text.trim() === '') return [];
      return [{metricId: metric.id, date: activeDate, value: Number(current.text)}];
    }
    return current.value == null ? [] : [{metricId: metric.id, date: activeDate, value: current.value}];
  });

  const metricsToSave = [
    ...(trackingTouched.metrics.water ? [{metricId: 'water', date: activeDate, value: metricValues.water}] : []),
    ...(trackingTouched.metrics.sleep ? [{metricId: 'sleep', date: activeDate, value: metricValues.sleep}] : []),
    ...(trackingTouched.metrics.exercise ? [{metricId: 'exercise', date: activeDate, value: metricValues.exercise, category: metricValues.exerciseCategory.toLowerCase()}] : []),
    ...(meal.label.trim() ? [{metricId: 'meal', date: activeDate, value: 1, label: meal.label.trim(), category: meal.category}] : []),
    ...customMetricsToSave,
  ];

  const hasTrackingChanges = Object.keys(trackingTouched.metrics).length > 0
    || meal.label.trim() !== ''
    || customMetricsToSave.length > 0;

  const trackingProps = {
    expanded: trackingExpanded,
    toggle: toggleTrackingSection,
    values: metricValues,
    setMetric: setMetricValue,
    setMeal: setMealValue,
    meal,
    customMetrics,
    customValues,
    setCustomMetric: setCustomMetricValue,
    preferences,
    ready: trackingReady,
  };

  const handleSubmit = async () => {
    const hasJournal = journalText.trim() !== '';
    if ((entry || hasJournal) && moodValue === 0) {
      Alert.alert('Error', 'Mood entry must be selected');
      return;
    }
    if (!entry && !hasJournal && !hasTrackingChanges) {
      Alert.alert('Nothing to save', 'Write an entry or change at least one tracking value.');
      return;
    }

    setSaving(true);
    submitted.current = true;
    try {
      if (entry) {
        await updateJournalEntry(entry.id, {journal: journalText, moodValue});
      } else {
        await saveJournalAndTracking({
          journal: hasJournal ? {
            date: activeDate,
            time: format(selectedTime, 'hh:mm a'),
            moodValue,
            journal: journalText,
            prompt,
          } : null,
          metrics: metricsToSave,
        });
      }

      await clearJournalDraft(draftId).catch(() => {});
      Alert.alert('Success', hasJournal ? 'Journal Entry and Mood Saved!' : 'Tracking data saved.');
      onClose();
    } catch (error) {
      submitted.current = false;
      setSaving(false);
      if (error instanceof DataValidationError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Could not save the entry on this device.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : entry ? 'height' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, entry && styles.editContainer]}
        keyboardShouldPersistTaps="handled">
        <Content
          formattedDate={formattedDate}
          formattedTime={format(selectedTime, 'hh:mm a')}
          date={activeDate}
          prompt={prompt}
          journalText={journalText}
          moodValue={moodValue}
          handleInputChange={handleInputChange}
          handleMoodSelection={handleMoodSelection}
          handleSubmit={handleSubmit}
          submitLabel={entry ? 'Save changes' : 'Save entry'}
          saving={saving}
          notice={restored ? 'Restored your unsaved writing.' : null}
          editMode={!!entry}
          trackingProps={trackingProps}
          openWritingMode={openWritingMode}
          onOpenDate={() => {
            setPendingDate(activeDate);
            setDatePickerOpen(true);
          }}
          onOpenTime={openTimePicker}
          canSubmit={entry
            ? journalText.trim() !== ''
            : ((journalText.trim() === '' || moodValue !== 0)
              && (journalText.trim() !== '' || (trackingReady && hasTrackingChanges)))}
        />
      </ScrollView>
      {writingMode && !entry ? (
      <View style={styles.writingOverlay}>
        <ImageBackground source={appBackground} resizeMode="cover" style={styles.writingBackground}>
          <View pointerEvents="none" style={styles.writingVeil} />
          <SafeAreaView style={styles.writingSafeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              style={styles.writingKeyboard}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={styles.writingHeader}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close writing mode"
                  onPress={closeWritingMode}
                  style={styles.writingCloseButton}>
                  <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primaryDeep} />
                </TouchableOpacity>
                <Text style={styles.writingTitle}>New entry</Text>
                <Button title="Done" onPress={closeWritingMode} style={styles.writingDoneButton} />
              </View>
              <ScrollView
                style={styles.writingScroll}
                contentContainerStyle={styles.writingScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
                <TextInput
                  ref={writingInputRef}
                  style={styles.writingInput}
                  textAlignVertical="top"
                  multiline
                  showSoftInputOnFocus={true}
                  maxLength={MAX_JOURNAL_LENGTH}
                  value={journalText}
                  selection={selection}
                  onSelectionChange={event => setSelection(event.nativeEvent.selection)}
                  placeholder="Write your journal entry here..."
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Journal entry"
                  onChangeText={handleInputChange}
                  blurOnSubmit={false}
                  scrollEnabled
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ImageBackground>
      </View>
      ) : null}
      <Modal visible={datePickerOpen && !entry} transparent animationType="fade" onRequestClose={() => setDatePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Choose date</Text>
            <Calendar
              current={pendingDate}
              maxDate={todayISO()}
              markedDates={{[pendingDate]: {selected: true, selectedColor: colors.primary}}}
              onDayPress={day => setPendingDate(day.dateString)}
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: colors.textMuted,
                dayTextColor: colors.text,
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#FFFFFF',
                textDisabledColor: colors.border,
                arrowColor: colors.primary,
                monthTextColor: colors.text,
              }}
            />
            <View style={styles.pickerActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setDatePickerOpen(false)} style={{flex: 1}} />
              <View style={{width: space.sm}} />
              <Button title="Done" onPress={confirmDate} style={{flex: 1}} />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={timePickerOpen && !entry} transparent animationType="fade" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.timePickerCard}>
            <Text style={styles.pickerTitle}>Choose time</Text>
            <View style={styles.timeSteppers}>
              <View style={styles.timeStepper}>
                <Text style={styles.blockLabel}>Hour</Text>
                <Stepper value={Number(pendingHour)} onChange={value => setPendingHour(String(value))} min={1} max={12} />
              </View>
              <View style={styles.timeStepper}>
                <Text style={styles.blockLabel}>Minute</Text>
                <Stepper value={Number(pendingMinute)} onChange={value => setPendingMinute(String(value).padStart(2, '0'))} min={0} max={59} />
              </View>
            </View>
            <View style={styles.periodChoices}>
              <Chip label="AM" selected={pendingPeriod === 'AM'} onPress={() => setPendingPeriod('AM')} />
              <Chip label="PM" selected={pendingPeriod === 'PM'} onPress={() => setPendingPeriod('PM')} />
            </View>
            <View style={styles.pickerActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setTimePickerOpen(false)} style={{flex: 1}} />
              <View style={{width: space.sm}} />
              <Button title="Done" onPress={confirmTime} style={{flex: 1}} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, width: '100%', backgroundColor: 'transparent'},
  container: {padding: space.lg, paddingBottom: space.xl * 2},
  editContainer: {flexGrow: 1, paddingHorizontal: space.lg, paddingTop: space.xl * 4, paddingBottom: space.lg},
  metaRow: {flexDirection: 'row', alignItems: 'center', marginBottom: space.sm},
  label: {fontWeight: 'bold', fontSize: 18, color: colors.text, marginLeft: space.sm},
  metaText: {fontSize: 18, color: colors.textMuted, flexShrink: 1},
  notice: {color: colors.textMuted, fontSize: 13, marginTop: space.md},
  promptCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.md,
  },
  promptKicker: {color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1},
  promptText: {color: colors.text, fontSize: 18, fontWeight: '600', marginTop: space.xs, lineHeight: 25},
  input: {
    width: '100%',
    minHeight: 220,
    borderColor: colors.border,
    borderWidth: 1,
    padding: space.lg,
    borderRadius: radius.lg,
    marginVertical: space.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  inputLauncher: {overflow: 'hidden'},
  inputLauncherText: {flex: 1, width: '100%', padding: 0, color: editColors.ink, fontSize: 17, lineHeight: 25},
  inputLauncherPlaceholder: {color: colors.textMuted},
  feelingText: {fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: space.sm},
  iconButtonContainer: {flexDirection: 'row', justifyContent: 'space-between'},
  iconButton: {
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
  icon: {fontSize: 26},
  moodCaption: {color: colors.textMuted, textAlign: 'center', marginTop: space.sm, fontSize: 14},
  submitButton: {
    backgroundColor: colors.primary,
    width: '100%',
    minHeight: 54,
    borderRadius: radius.md,
    marginTop: space.xl,
    justifyContent: 'center',
  },
  submitButtonDisabled: {backgroundColor: colors.surfaceAlt, opacity: 0.7},
  submitButtonText: {textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: colors.text},
  editMetaRow: {flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md},
  editMetaCard: {
    flex: 1,
    minHeight: 78,
    marginBottom: 0,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F0DDF0',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#745484',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  editMetaTextGroup: {flex: 1, marginLeft: space.sm},
  editLabel: {marginLeft: 0, fontSize: 14, color: editColors.ink},
  editMetaText: {fontSize: 13, lineHeight: 19, color: editColors.muted},
  editInput: {
    minHeight: 280,
    height: 0,
    flexGrow: 1,
    marginVertical: space.md,
    padding: space.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    color: editColors.ink,
    fontSize: 17,
    lineHeight: 25,
    shadowColor: '#704580',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  editFeelingText: {color: editColors.ink, marginTop: space.sm},
  editMoodCard: {
    marginTop: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F0DDF0',
    backgroundColor: '#FFFFFF',
    shadowColor: editColors.pink,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  editIconButtonContainer: {gap: space.sm, marginTop: space.xs},
  editIconButton: {
    height: 64,
    marginHorizontal: 0,
    borderRadius: radius.pill,
    borderColor: '#E9DDF4',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#745484',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.10,
    shadowRadius: 7,
    elevation: 2,
  },
  editSelectedMood: {backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 2, transform: [{scale: 1.06}], elevation: 5, shadowColor: editColors.pink, shadowOpacity: 0.28, shadowRadius: 10},
  editIcon: {fontSize: 30, opacity: 1},
  editMoodCaption: {color: editColors.muted, fontWeight: '600', minHeight: 20},
  editSubmitButton: {
    minHeight: 60,
    marginTop: space.md,
    marginBottom: space.sm,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: editColors.pink,
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  editButtonGradient: { ...StyleSheet.absoluteFillObject, borderRadius: radius.pill },
  newMetaRow: {flexDirection: 'row', gap: space.sm, marginBottom: space.xs},
  newMetaCard: {
    flex: 1,
    minHeight: 78,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E9DDF4',
    backgroundColor: '#FFFFFF',
  },
  newMetaTextGroup: {flex: 1, marginLeft: space.sm},
  newMetaLabel: {color: colors.textMuted, fontSize: 13},
  newMetaValue: {color: editColors.ink, fontSize: 16, fontWeight: '700', marginTop: 2},
  dateTimeNote: {flexDirection: 'row', alignItems: 'center', marginBottom: space.md},
  dateTimeNoteText: {color: colors.textMuted, fontSize: 13, marginLeft: space.sm, flex: 1},
  newMoodCard: {padding: space.md, borderRadius: radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0DDF0', marginBottom: space.md},
  newSelectedMood: {backgroundColor: '#FFFFFF', borderColor: '#F52BCB', borderWidth: 2},
  modalBackdrop: {flex: 1, justifyContent: 'center', padding: space.lg, backgroundColor: 'rgba(19,20,50,0.30)'},
  pickerCard: {borderRadius: radius.lg, backgroundColor: '#FFFFFF', padding: space.md, overflow: 'hidden'},
  timePickerCard: {borderRadius: radius.lg, backgroundColor: '#FFFFFF', padding: space.lg},
  pickerTitle: {color: editColors.ink, fontSize: 18, fontWeight: '700', margin: space.sm},
  pickerActions: {flexDirection: 'row', marginTop: space.sm},
  timeSteppers: {gap: space.sm},
  timeStepper: {width: '100%'},
  periodChoices: {flexDirection: 'row', justifyContent: 'center', marginTop: space.sm},
  writingOverlay: {...StyleSheet.absoluteFillObject, zIndex: 20, elevation: 20},
  writingBackground: {flex: 1},
  writingVeil: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.70)'},
  writingSafeArea: {flex: 1},
  writingKeyboard: {flex: 1},
  writingHeader: {minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md},
  writingCloseButton: {width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,43,203,0.10)'},
  writingTitle: {flex: 1, color: editColors.ink, fontSize: 20, fontWeight: '700'},
  writingDoneButton: {minWidth: 92},
  writingScroll: {flex: 1},
  writingScrollContent: {flexGrow: 1, padding: space.lg, paddingBottom: space.xl},
  writingInput: {
    flex: 1,
    minHeight: 280,
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E9DDF4',
    backgroundColor: '#FFFFFF',
    color: editColors.ink,
    fontSize: 18,
    lineHeight: 27,
    padding: space.lg,
    textAlignVertical: 'top',
  },
  trackingSections: {marginBottom: space.sm},
  trackingCard: {
    padding: space.md,
    marginBottom: space.sm,
    backgroundColor: '#FFFFFF',
    borderColor: '#E9DDF4',
    shadowColor: '#745484',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  trackingSectionHeader: {minHeight: 58, flexDirection: 'row', alignItems: 'center'},
  trackingIconCircle: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: space.md},
  trackingSectionCopy: {flex: 1},
  trackingSectionTitle: {color: editColors.ink, fontSize: 16, fontWeight: '700'},
  trackingSectionDescription: {color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2},
  trackingSectionBody: {paddingTop: space.md},
  trackingChips: {flexDirection: 'row', flexWrap: 'wrap'},
  trackingEquiv: {color: editColors.muted, textAlign: 'center', marginTop: space.sm, fontSize: 14},
  customMetricGroup: {paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: '#F0DDF0'},
  trackingMetricTitle: {color: editColors.ink, fontSize: 15, fontWeight: '700', marginBottom: space.sm},
  trackingHint: {color: editColors.muted, fontSize: 14, paddingVertical: space.sm},
});

export default JournalEntryScreen;
