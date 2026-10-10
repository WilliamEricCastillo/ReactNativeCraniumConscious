import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Calendar} from 'react-native-calendars';

import {Card, Button, SectionTitle, Note} from '../../components/ui';
import {todayISO, formatWeekdayDate} from '../../utils/dates';
import {colors, moodOptions, radius, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const FIRST_DAY = {sunday: 0, monday: 1, saturday: 6};

const calendarTheme = {
  calendarBackground: colors.surface,
  textSectionTitleColor: colors.textMuted,
  dayTextColor: colors.text,
  todayTextColor: colors.primary,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.text,
  textDisabledColor: colors.border,
  arrowColor: colors.primary,
  monthTextColor: colors.text,
  dotColor: colors.primary,
  selectedDotColor: colors.text,
  textDayFontWeight: '500',
  textMonthFontWeight: '700',
};

// `activeDates`: days with any saved record (shown as a dot). `entries`: all journal entries.
const JournalCalendar = ({navigation, entries, activeDates, weekStart}) => {
  const today = todayISO();
  const [selected, setSelected] = useState(today);

  const marked = {};
  activeDates.forEach(d => {
    marked[d] = {marked: true};
  });
  marked[selected] = {...marked[selected], selected: true};

  const dayEntries = entries.filter(e => e.date === selected);

  return (
    <View>
      <Calendar
        key={weekStart}
        firstDay={FIRST_DAY[weekStart] ?? 1}
        maxDate={today}
        markedDates={marked}
        onDayPress={day => setSelected(day.dateString)}
        theme={calendarTheme}
        style={styles.calendar}
      />

      <SectionTitle title={formatWeekdayDate(selected)} action="Open day" onAction={() => navigation.navigate(ROUTES.day, {date: selected})} />
      {dayEntries.length === 0 ? (
        <Note>No journal entries on this day.</Note>
      ) : (
        dayEntries.map(entry => {
          const mood = moodOptions.find(m => m.value === entry.moodValue);
          return (
            <Card
              key={entry.id}
              onPress={() => navigation.navigate(ROUTES.journalEntry, {entryId: entry.id})}
              accessibilityLabel={`Journal entry from ${entry.time}`}>
              <Text style={styles.time}>
                {mood ? `${mood.emoji}  ` : ''}
                {entry.time}
              </Text>
              <Text style={styles.preview} numberOfLines={3}>
                {entry.journal}
              </Text>
            </Card>
          );
        })
      )}
      <Button
        title="Write an entry for this day"
        icon="pencil-plus"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.journalNew, {date: selected})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  calendar: {borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginTop: space.md},
  time: {color: colors.textMuted, fontSize: 14, marginBottom: space.xs},
  preview: {color: colors.text, fontSize: 15, lineHeight: 22},
});

export default JournalCalendar;
