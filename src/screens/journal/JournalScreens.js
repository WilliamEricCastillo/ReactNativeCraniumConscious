import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import JournalEntryScreen from '../CalendarScreens/JournalEntryComponent';
import {Screen, Title, Card, Button, EmptyState, ListRow, SectionTitle} from '../../components/ui';
import {getJournalEntry, deleteJournalEntry} from '../../../services/data/dataService';
import {isValidISODate, todayISO, formatLongDate} from '../../utils/dates';
import {PROMPT_CATEGORIES} from '../../data/sample';
import {colors, moodOptions, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const safeDate = value => (isValidISODate(value) ? value : todayISO());

export const JournalNewScreen = ({navigation, route}) => (
  <JournalEntryScreen
    route={{params: {date: safeDate(route.params?.date)}}}
    onClose={() => navigation.goBack()}
  />
);

export const JournalPromptsScreen = ({navigation}) => (
  <Screen>
    <Title subtitle="Pick a prompt to start writing">Prompts</Title>
    {PROMPT_CATEGORIES.map(category => (
      <View key={category.id}>
        <SectionTitle title={category.title} />
        {category.prompts.map(prompt => (
          <ListRow
            key={prompt}
            title={prompt}
            icon="lightbulb-on-outline"
            onPress={() =>
              navigation.navigate(ROUTES.journalNewPrompt, {prompt, date: todayISO()})
            }
          />
        ))}
      </View>
    ))}
  </Screen>
);

export const JournalNewPromptScreen = ({navigation, route}) => {
  const prompt = route.params?.prompt;
  if (!prompt) {
    return (
      <Screen>
        <EmptyState
          title="No prompt selected"
          message="Choose a prompt to write about."
          actionLabel="Browse prompts"
          onAction={() => navigation.replace(ROUTES.journalPrompts)}
        />
      </Screen>
    );
  }
  return (
    <JournalEntryScreen
      route={{params: {date: safeDate(route.params?.date)}}}
      prompt={prompt}
      onClose={() => navigation.goBack()}
    />
  );
};

// state: 'loading' | 'missing' | entry object
const useEntry = entryId => {
  const [entry, setEntry] = useState('loading');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!entryId) {
        setEntry('missing');
        return undefined;
      }
      getJournalEntry(entryId)
        .then(found => active && setEntry(found || 'missing'))
        .catch(() => active && setEntry('missing'));
      return () => {
        active = false;
      };
    }, [entryId]),
  );
  return entry;
};

const NotFound = ({navigation}) => (
  <Screen>
    <EmptyState
      icon="file-question-outline"
      title="Entry not found"
      message="This entry does not exist on this device, or its link is invalid."
      actionLabel="Back to Journal"
      onAction={() => navigation.navigate(ROUTES.tabs, {screen: ROUTES.journal})}
    />
  </Screen>
);

const Loading = () => (
  <Screen scroll={false} contentStyle={{justifyContent: 'center'}}>
    <ActivityIndicator color={colors.primary} size="large" />
  </Screen>
);

export const JournalEntryDetailScreen = ({navigation, route}) => {
  const entryId = route.params?.entryId;
  const entry = useEntry(entryId);

  if (entry === 'loading') return <Loading />;
  if (entry === 'missing') return <NotFound navigation={navigation} />;

  const mood = moodOptions.find(m => m.value === entry.moodValue);
  const confirmDelete = () =>
    Alert.alert('Delete this entry?', 'This removes it from this device and cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJournalEntry(entry.id);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Could not delete the entry on this device.');
          }
        },
      },
    ]);
  return (
    <Screen>
      <Title subtitle={`${formatLongDate(entry.date)} at ${entry.time}`}>Journal entry</Title>
      <Card>
        <View style={styles.moodRow}>
          <Text style={styles.emoji}>{mood ? mood.emoji : '📝'}</Text>
          <Text style={styles.moodLabel}>{mood ? mood.label : 'No mood recorded'}</Text>
        </View>
      </Card>
      {entry.prompt ? (
        <Card accent={colors.primary}>
          <Text style={styles.kicker}>PROMPT</Text>
          <Text style={styles.body}>{entry.prompt}</Text>
        </Card>
      ) : null}
      <Card>
        <Text style={styles.body}>{entry.journal}</Text>
      </Card>
      <Button
        title="Edit entry"
        icon="pencil-outline"
        onPress={() => navigation.navigate(ROUTES.journalEdit, {entryId: entry.id})}
      />
      <Button title="Delete entry" variant="ghost" onPress={confirmDelete} style={{marginTop: space.sm}} />
    </Screen>
  );
};

export const JournalEditScreen = ({navigation, route}) => {
  const entry = useEntry(route.params?.entryId);

  if (entry === 'loading') return <Loading />;
  if (entry === 'missing') return <NotFound navigation={navigation} />;

  return (
    <JournalEntryScreen
      key={entry.id}
      route={{params: {date: entry.date}}}
      entry={entry}
      prompt={entry.prompt}
      onClose={() => navigation.goBack()}
    />
  );
};

const styles = StyleSheet.create({
  moodRow: {flexDirection: 'row', alignItems: 'center'},
  emoji: {fontSize: 34, marginRight: space.md},
  moodLabel: {color: colors.text, fontSize: 18, fontWeight: '700'},
  kicker: {color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: space.xs},
  body: {color: colors.text, fontSize: 16, lineHeight: 24},
});
