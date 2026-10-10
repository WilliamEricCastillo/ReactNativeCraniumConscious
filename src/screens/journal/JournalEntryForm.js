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
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {format} from 'date-fns';
import {
  createJournalEntry,
  updateJournalEntry,
  getJournalDraft,
  saveJournalDraft,
  clearJournalDraft,
  journalDraftId,
} from '../../../services/data/dataService';
import {DataValidationError, MAX_JOURNAL_LENGTH} from '../../../services/data/models';
import {formatLongDate} from '../../utils/dates';
import {colors, moodOptions, radius, space, MIN_TOUCH} from '../../theme/theme';

const Content = ({
  formattedDate,
  formattedTime,
  isCurrentDate,
  prompt,
  journalText,
  moodValue,
  handleInputChange,
  handleMoodSelection,
  handleSubmit,
  submitLabel,
  saving,
  notice,
}) => (
  <>
    <View style={styles.metaRow}>
      <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
      <Text style={styles.label}>Date: </Text>
      <Text style={styles.metaText}>
        {formattedDate} {isCurrentDate && '(Current Date)'}
      </Text>
    </View>
    <View style={styles.metaRow}>
      <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
      <Text style={styles.label}>Time: </Text>
      <Text style={styles.metaText}>{formattedTime}</Text>
    </View>

    {prompt ? (
      <View style={styles.promptCard}>
        <Text style={styles.promptKicker}>PROMPT</Text>
        <Text style={styles.promptText}>{prompt}</Text>
      </View>
    ) : null}

    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    <TextInput
      style={styles.input}
      textAlignVertical="top"
      multiline
      maxLength={MAX_JOURNAL_LENGTH}
      value={journalText}
      placeholder="Write your journal entry here..."
      placeholderTextColor={colors.textMuted}
      accessibilityLabel="Journal entry"
      onChangeText={handleInputChange}
    />

    <Text style={styles.feelingText}>Mood:</Text>
    <View style={styles.iconButtonContainer}>
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
              selected && {backgroundColor: option.color, borderColor: option.color},
            ]}
            onPress={() => handleMoodSelection(option.value)}>
            <Text style={[styles.icon, !selected && {opacity: 0.75}]}>{option.emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <Text style={styles.moodCaption}>
      {moodValue === 0
        ? 'Select how you feel'
        : moodOptions.find(m => m.value === moodValue)?.label}
    </Text>

    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.submitButton, (journalText.trim() === '' || saving) && styles.submitButtonDisabled]}
      onPress={handleSubmit}
      disabled={journalText.trim() === '' || saving}>
      <Text style={styles.submitButtonText}>{submitLabel}</Text>
    </TouchableOpacity>
  </>
);

// Existing journal-entry screen, restyled. Also used for prompt entries (`prompt`) and editing (`entry`).
const JournalEntryScreen = ({route, onClose, prompt, entry}) => {
  const {date} = route.params;

  const formattedDate = formatLongDate(date);
  const isCurrentDate = format(new Date(), 'yyyy-MM-dd') === date;

  const [moodValue, setMoodValue] = useState(entry ? entry.moodValue : 0);
  const [journalText, setJournalText] = useState(entry ? entry.journal : '');
  const [currentTime, setCurrentTime] = useState(entry ? entry.time : format(new Date(), 'hh:mm a'));
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Unsaved writing is kept on this device (never uploaded) so Back, a crash or a remount cannot lose it.
  const draftId = journalDraftId({date, entryId: entry?.id, prompt});
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
        if (draft.moodValue >= 1 && draft.moodValue <= 5) setMoodValue(draft.moodValue);
        setRestored(true);
      })
      .catch(() => {})
      .finally(() => active && setDraftLoaded(true));
    return () => {
      active = false;
    };
  }, [draftId]);

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
    if (entry) {
      return undefined;
    }
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), 'hh:mm a'));
    }, 1000);
    return () => clearInterval(interval);
  }, [entry]);

  const handleMoodSelection = value => {
    setMoodValue(value);
  };

  const handleInputChange = text => {
    setJournalText(text);
  };

  const handleSubmit = async () => {
    if (moodValue === 0) {
      Alert.alert('Error', 'Mood entry must be selected');
      return;
    }

    setSaving(true);
    submitted.current = true;
    try {
      if (entry) {
        await updateJournalEntry(entry.id, {journal: journalText, moodValue});
      } else {
        await createJournalEntry({
          date: date.toString(),
          time: currentTime.toString(),
          moodValue,
          journal: journalText,
          prompt,
        });
      }

      await clearJournalDraft(draftId).catch(() => {});
      Alert.alert('Success', 'Journal Entry and Mood Saved!');
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <Content
          formattedDate={formattedDate}
          formattedTime={currentTime}
          isCurrentDate={isCurrentDate}
          prompt={prompt}
          journalText={journalText}
          moodValue={moodValue}
          handleInputChange={handleInputChange}
          handleMoodSelection={handleMoodSelection}
          handleSubmit={handleSubmit}
          submitLabel={entry ? 'Save changes' : 'Submit'}
          saving={saving}
          notice={restored ? 'Restored your unsaved writing.' : null}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, width: '100%', backgroundColor: colors.bg},
  container: {padding: space.lg, paddingBottom: space.xl * 2},
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
});

export default JournalEntryScreen;
