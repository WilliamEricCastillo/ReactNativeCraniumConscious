import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import {Screen, Title, Card, Button, Chip, EmptyState, SectionTitle, Note} from '../../components/ui';
import JournalCalendar from '../journal/JournalCalendar';
import {listJournalEntries, listActiveDates, getPreferences} from '../../../services/data/dataService';
import {todayISO, formatWeekdayDate} from '../../utils/dates';
import {colors, moodOptions, radius, space, MIN_TOUCH} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const FILTERS = [
  {id: 'all', label: 'All', test: () => true},
  {id: 'positive', label: 'Positive', test: e => e.moodValue >= 4},
  {id: 'neutral', label: 'Neutral', test: e => e.moodValue === 3},
  {id: 'low', label: 'Low', test: e => e.moodValue <= 2},
];

const JournalScreen = ({navigation, route}) => {
  const [entries, setEntries] = useState([]);
  const [activeDates, setActiveDates] = useState([]);
  const [weekStart, setWeekStart] = useState('monday');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState(route.params?.view === 'calendar' ? 'calendar' : 'list');

  // Today's "Calendar" link opens this tab with params.view.
  useEffect(() => {
    if (route.params?.view === 'calendar' || route.params?.view === 'list') setView(route.params.view);
  }, [route.params?.view]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([listJournalEntries(), listActiveDates(), getPreferences()])
        .then(([list, dates, prefs]) => {
          if (active) {
            setEntries(list);
            setActiveDates(dates);
            setWeekStart(prefs.weekStart);
            setError(false);
          }
        })
        .catch(() => active && setError(true))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  const groups = useMemo(() => {
    const test = FILTERS.find(f => f.id === filter).test;
    const q = query.trim().toLowerCase();
    const visible = entries
      .filter(test)
      .filter(e => !q || (e.journal || '').toLowerCase().includes(q))
      .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
    const byDate = {};
    visible.forEach(e => {
      (byDate[e.date] = byDate[e.date] || []).push(e);
    });
    return Object.keys(byDate)
      .sort()
      .reverse()
      .map(date => ({date, items: byDate[date]}));
  }, [entries, query, filter]);

  const newEntry = () => navigation.navigate(ROUTES.journalNew, {date: todayISO()});

  return (
    <Screen tab>
      <Title subtitle="Private, on this device">Journal</Title>

      <View style={styles.actions}>
        <Button title="New entry" icon="pencil-plus" onPress={newEntry} style={{flex: 1}} />
        <View style={{width: space.sm}} />
        <Button
          title="Prompts"
          icon="lightbulb-on-outline"
          variant="secondary"
          onPress={() => navigation.navigate(ROUTES.journalPrompts)}
          style={{flex: 1}}
        />
      </View>
      <View style={styles.viewToggle}>
        <Chip label="List" selected={view === 'list'} onPress={() => setView('list')} />
        <Chip label="Calendar" selected={view === 'calendar'} onPress={() => setView('calendar')} />
      </View>

      {error ? <Note>Could not read your saved entries on this device. They have not been removed.</Note> : null}

      {view === 'calendar' ? (
        <JournalCalendar navigation={navigation} entries={entries} activeDates={activeDates} weekStart={weekStart} />
      ) : (
        <>
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search entries"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Search entries"
          style={styles.searchInput}
        />
      </View>
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </View>

      {!loading && !error && entries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          message="Your journal entries will appear here. Start with a blank page or a prompt."
          actionLabel="Write your first entry"
          onAction={newEntry}
        />
      ) : null}

      {entries.length > 0 && groups.length === 0 ? (
        <EmptyState icon="magnify" title="No matching entries" message="Try a different search or filter." />
      ) : null}

      {groups.map(group => (
        <View key={group.date}>
          <SectionTitle title={formatWeekdayDate(group.date)} />
          {group.items.map(entry => {
            const mood = moodOptions.find(m => m.value === entry.moodValue);
            return (
              <Card
                key={entry.id}
                onPress={() => navigation.navigate(ROUTES.journalEntry, {entryId: entry.id})}
                accessibilityLabel={`Journal entry from ${entry.time}`}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryEmoji}>{mood ? mood.emoji : '📝'}</Text>
                  <Text style={styles.entryTime}>{entry.time}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Edit entry"
                    hitSlop={8}
                    style={styles.editBtn}
                    onPress={() => navigation.navigate(ROUTES.journalEdit, {entryId: entry.id})}>
                    <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.preview} numberOfLines={3}>
                  {entry.journal}
                </Text>
              </Card>
            );
          })}
        </View>
      ))}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  actions: {flexDirection: 'row'},
  viewToggle: {flexDirection: 'row', marginTop: space.lg},
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    marginTop: space.lg,
    marginBottom: space.md,
  },
  searchInput: {flex: 1, minHeight: MIN_TOUCH, color: colors.text, fontSize: 16, marginLeft: space.sm},
  filters: {flexDirection: 'row', flexWrap: 'wrap'},
  entryHead: {flexDirection: 'row', alignItems: 'center', marginBottom: space.sm},
  entryEmoji: {fontSize: 22, marginRight: space.sm},
  entryTime: {color: colors.textMuted, fontSize: 14, flex: 1},
  editBtn: {width: MIN_TOUCH, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -space.md},
  preview: {color: colors.text, fontSize: 15, lineHeight: 22},
});

export default JournalScreen;
