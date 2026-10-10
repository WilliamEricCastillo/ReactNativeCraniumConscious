import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, Switch, Alert, Linking} from 'react-native';

import {Screen, Title, Card, Button, Chip, Field, FormActions, ListRow, Note, SectionTitle, EmptyState, Stepper} from '../../components/ui';
import useAsyncData from '../../hooks/useAsyncData';
import {
  listGoals,
  getRangeData,
  setGoalByTitle,
  getPreferences,
  setMetricTracked,
  listCustomMetrics,
  getCustomMetric,
  createCustomMetric,
  updateCustomMetric,
  archiveCustomMetric,
  listReminders,
  setReminderPreset,
  setReminderTime,
  listJournalEntries,
  listDailyCheckIns,
  listMetricEntries,
  getSyncStatus,
  claimLocalData,
  syncNow,
  getStorageHealth,
} from '../../../services/data/dataService';
import {DataValidationError} from '../../../services/data/models';
import {METRIC_INFO, getMetricInfo} from '../../data/metrics';
import {buildDays, goalProgress, weekStartDate} from '../../utils/analytics';
import {todayISO} from '../../utils/dates';
import {getPermission, requestPermission, getScheduledReminderIds, applyReminder, syncReminders} from '../../../services/notifications';
import {formatTime, describeDays} from '../../../services/reminderSchedule';
import {AUTH_ENABLED} from '../../config/features';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const STORED = 'Saved on this device only.';

const reportError = error =>
  Alert.alert(
    'Could not save',
    error instanceof DataValidationError ? error.message : 'Something went wrong saving on this device.',
  );

export const SwitchRow = ({title, subtitle, value, onValueChange}) => (
  <View style={styles.switchRow}>
    <View style={{flex: 1, paddingRight: space.md}}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={title}
      trackColor={{false: colors.surfaceAlt, true: colors.primaryDeep}}
      thumbColor={value ? colors.primary : colors.textMuted}
    />
  </View>
);

const GOALS = ['Sleep 7+ hours', 'Move every day', 'Journal 3 times a week', 'Drink more water', 'Lower daily stress'];

const READ_ERROR = 'Could not read saved data on this device. Nothing has been removed.';

// Progress for each active goal over the current week (the week starts on the day chosen in Settings).
const loadGoals = async () => {
  const [goals, preferences] = await Promise.all([listGoals(), getPreferences()]);
  const today = todayISO();
  const from = weekStartDate(today, preferences.weekStart);
  const days = buildDays(await getRangeData({from, to: today}), from, today);
  return {goals, progress: Object.fromEntries(goals.map(g => [g.id, goalProgress(g.title, days)]))};
};

export const GoalsScreen = () => {
  const {data, error, reload} = useAsyncData(loadGoals, {goals: [], progress: {}});
  const {goals, progress} = data;

  const toggle = async title => {
    try {
      await setGoalByTitle(title, !goals.some(g => g.title === title));
      await reload();
    } catch (e) {
      reportError(e);
    }
  };

  return (
    <Screen>
      <Title subtitle="Choose what you would like to work toward">Goals</Title>
      {error ? <Note>{READ_ERROR}</Note> : null}
      <View style={styles.wrap}>
        {GOALS.map(g => (
          <Chip key={g} label={g} selected={goals.some(x => x.title === g)} onPress={() => toggle(g)} />
        ))}
      </View>

      <SectionTitle title="This week" />
      {goals.length === 0 ? (
        <Note>Pick a goal above to see your progress calculated from what you log.</Note>
      ) : (
        goals.map(g => {
          const p = progress[g.id];
          return (
            <Card key={g.id}>
              <Text style={styles.rowTitle}>{g.title}</Text>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, {width: `${Math.round((p?.fraction ?? 0) * 100)}%`}]} />
              </View>
              <Text style={styles.body}>{p?.text}</Text>
              {p?.hint ? <Text style={styles.muted}>{p.hint}</Text> : null}
            </Card>
          );
        })
      )}
      <Note>{STORED}</Note>
    </Screen>
  );
};

const loadMetricsOverview = async () => {
  const [preferences, custom] = await Promise.all([getPreferences(), listCustomMetrics()]);
  return {tracked: preferences.trackedMetricIds, custom};
};

export const MetricsScreen = ({navigation}) => {
  const {data, error, reload} = useAsyncData(loadMetricsOverview, {tracked: [], custom: []});

  const toggle = async id => {
    try {
      await setMetricTracked(id, !data.tracked.includes(id));
      await reload();
    } catch (e) {
      reportError(e);
    }
  };

  const rows = [
    ...Object.keys(METRIC_INFO).map(id => ({id, ...METRIC_INFO[id]})),
    ...data.custom.map(m => ({id: m.id, title: m.name, unit: m.unit || m.valueType, icon: 'tune-variant', color: colors.primary})),
  ];

  return (
    <Screen>
      <Title subtitle="Choose what appears on Today, or create your own">My metrics</Title>
      {error ? <Note>{READ_ERROR}</Note> : null}
      {rows.map(row => (
        <ListRow
          key={row.id}
          title={row.title}
          subtitle={row.unit}
          icon={row.icon}
          color={row.color}
          onPress={() => navigation.navigate(ROUTES.metric, {metricId: row.id})}
          right={
            <Switch
              value={data.tracked.includes(row.id)}
              onValueChange={() => toggle(row.id)}
              accessibilityLabel={`Track ${row.title}`}
              trackColor={{false: colors.surfaceAlt, true: colors.primaryDeep}}
              thumbColor={data.tracked.includes(row.id) ? colors.primary : colors.textMuted}
            />
          }
        />
      ))}
      <Button title="Add custom metric" icon="plus" onPress={() => navigation.navigate(ROUTES.metricNew)} style={{marginTop: space.md}} />
      <Note>{STORED}</Note>
    </Screen>
  );
};

const METRIC_TYPES = [
  {label: 'Number', value: 'number'},
  {label: 'Scale 1-5', value: 'scale'},
  {label: 'Yes / No', value: 'boolean'},
];

export const MetricNewScreen = ({navigation}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [type, setType] = useState('number');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await createCustomMetric({name, unit, valueType: type});
      navigation.goBack();
    } catch (error) {
      setSaving(false);
      reportError(error);
    }
  };

  return (
    <Screen>
      <Title subtitle="Define something of your own to track">New metric</Title>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Meditation" />
      <Field label="Unit (optional)" value={unit} onChangeText={setUnit} placeholder="e.g. minutes" />
      <Text style={styles.label}>Type</Text>
      <View style={styles.wrap}>
        {METRIC_TYPES.map(t => (
          <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </View>
      <Note>{STORED}</Note>
      <FormActions saveDisabled={name.trim() === '' || saving} onCancel={() => navigation.goBack()} onSave={save} />
    </Screen>
  );
};

export const MetricDetailScreen = ({navigation, route}) => {
  const metricId = route.params?.metricId;
  const builtin = getMetricInfo(metricId);
  const load = useCallback(async () => (builtin || !metricId ? null : getCustomMetric(metricId)), [builtin, metricId]);
  const {data: custom, loaded} = useAsyncData(load, null);

  if (builtin) {
    return (
      <Screen>
        <Title subtitle={`Unit: ${builtin.unit}`}>{builtin.title}</Title>
        <Note>Built-in metrics cannot be renamed.</Note>
      </Screen>
    );
  }
  if (!loaded) return <Screen><Note>Loading...</Note></Screen>;
  if (!custom || custom.archivedAt) {
    return (
      <Screen>
        <EmptyState
          icon="help-circle-outline"
          title="Unknown metric"
          message="That metric does not exist."
          actionLabel="My metrics"
          onAction={() => navigation.replace(ROUTES.metrics)}
        />
      </Screen>
    );
  }
  return <CustomMetricForm key={custom.id} metric={custom} navigation={navigation} />;
};

const CustomMetricForm = ({metric, navigation}) => {
  const [name, setName] = useState(metric.name);
  const [unit, setUnit] = useState(metric.unit);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateCustomMetric(metric.id, {name, unit: unit.trim()});
      navigation.goBack();
    } catch (error) {
      setSaving(false);
      reportError(error);
    }
  };

  const archive = () =>
    Alert.alert('Archive this metric?', 'It will be hidden. Entries you already logged are kept.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveCustomMetric(metric.id);
            navigation.goBack();
          } catch (error) {
            reportError(error);
          }
        },
      },
    ]);

  return (
    <Screen>
      <Title subtitle="Edit how this metric appears">{metric.name}</Title>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Unit" value={unit} onChangeText={setUnit} />
      <FormActions saveDisabled={name.trim() === '' || saving} onCancel={() => navigation.goBack()} onSave={save} />
      <Button title="Archive metric" variant="ghost" onPress={archive} style={{marginTop: space.md}} />
    </Screen>
  );
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const REMINDER_PRESETS = [
  {label: 'Morning check-in', kind: 'check-in', time: '09:00', daysOfWeek: ALL_DAYS},
  {label: 'Evening journal', kind: 'journal', time: '20:30', daysOfWeek: ALL_DAYS},
  {label: 'Weekly review', kind: 'weekly-review', time: '18:00', daysOfWeek: [0]},
];

// Permission and scheduled state come from the operating system, not from the saved switches.
const loadReminders = async () => {
  const reminders = await listReminders();
  try {
    const [permission, scheduled] = await Promise.all([getPermission(), getScheduledReminderIds()]);
    return {reminders, permission, scheduled: [...scheduled]};
  } catch {
    return {reminders, permission: 'unavailable', scheduled: []};
  }
};

const pad = n => String(n).padStart(2, '0');

export const RemindersScreen = () => {
  const {data, error, reload} = useAsyncData(loadReminders, {reminders: [], permission: null, scheduled: []});
  const {reminders, permission, scheduled} = data;
  const [editing, setEditing] = useState(null);

  const stored = preset => reminders.find(r => r.label === preset.label);

  const apply = async record => {
    try {
      await applyReminder(record);
    } catch {
      Alert.alert('Could not schedule', 'The reminder was saved, but the system would not schedule it.');
    }
  };

  const allow = async () => {
    try {
      const result = await requestPermission();
      if (result === 'granted') await syncReminders(await listReminders());
    } catch {
      Alert.alert('Notifications unavailable', 'This build cannot show notifications.');
    }
    await reload();
  };

  const toggle = async (preset, enabled) => {
    try {
      const {kind, label, time, daysOfWeek} = stored(preset) || preset;
      const record = await setReminderPreset({kind, label, time, daysOfWeek}, enabled);
      if (enabled && permission === 'undetermined') await requestPermission();
      await apply(record);
    } catch (e) {
      reportError(e);
    }
    await reload();
  };

  const startEdit = preset => {
    const [hour, minute] = (stored(preset) || preset).time.split(':').map(Number);
    setEditing({label: preset.label, hour, minute});
  };

  const saveTime = async preset => {
    try {
      const record = await setReminderTime(preset, `${pad(editing.hour)}:${pad(editing.minute)}`);
      await apply(record);
      setEditing(null);
    } catch (e) {
      reportError(e);
    }
    await reload();
  };

  const statusOf = preset => {
    const record = stored(preset);
    if (!record?.enabled) return 'Off';
    if (permission === 'granted') return scheduled.includes(record.id) ? 'Scheduled' : 'Not scheduled';
    return 'Waiting for notification permission';
  };

  return (
    <Screen>
      <Title subtitle="Gentle nudges, never pressure">Reminders</Title>
      {error ? <Note>{READ_ERROR}</Note> : null}

      {permission === 'undetermined' ? (
        <Card>
          <Text style={styles.rowTitle}>Allow notifications</Text>
          <Text style={styles.body}>Reminders are local notifications on this phone. Android needs your permission first.</Text>
          <Button title="Allow notifications" icon="bell-ring-outline" onPress={allow} style={{marginTop: space.md}} />
        </Card>
      ) : null}
      {permission === 'blocked' ? (
        <Card>
          <Text style={styles.rowTitle}>Notifications are blocked</Text>
          <Text style={styles.body}>Turn them on for Cranium Conscious in your phone's settings to receive reminders.</Text>
          <Button title="Open settings" variant="secondary" onPress={() => Linking.openSettings()} style={{marginTop: space.md}} />
        </Card>
      ) : null}
      {permission === 'unavailable' ? (
        <Note>This build of the app cannot schedule notifications, so reminders will not fire.</Note>
      ) : null}

      {REMINDER_PRESETS.map(preset => {
        const record = stored(preset);
        const current = record || preset;
        const open = editing?.label === preset.label;
        return (
          <Card key={preset.label}>
            <SwitchRow
              title={preset.label}
              subtitle={`${formatTime(current.time)} · ${describeDays(current.daysOfWeek)}`}
              value={!!record?.enabled}
              onValueChange={value => toggle(preset, value)}
            />
            <Text style={styles.muted}>{statusOf(preset)}</Text>
            {open ? (
              <View>
                <View style={styles.timeRow}>
                  <Stepper value={editing.hour} onChange={hour => setEditing({...editing, hour})} min={0} max={23} unit="hour" />
                  <Stepper value={editing.minute} onChange={minute => setEditing({...editing, minute})} step={5} min={0} max={55} unit="minute" />
                </View>
                <FormActions onCancel={() => setEditing(null)} onSave={() => saveTime(preset)} saveTitle="Save time" />
              </View>
            ) : (
              <Button title="Change time" variant="ghost" onPress={() => startEdit(preset)} />
            )}
          </Card>
        );
      })}
      <Note>Reminders repeat on their schedule and are sent by your phone, not a server. Android may delay them slightly to save battery.</Note>
    </Screen>
  );
};

export const PrivacyScreen = () => (
  <Screen>
    <Title subtitle="Your reflections are yours">Privacy</Title>
    <Card>
      <Text style={styles.rowTitle}>Where your data lives</Text>
      <Text style={styles.body}>
        Journal entries and wellness records are saved on this device first and work offline. Cloud sync is
        built but turned off in this build; it will only run after you sign in with a verified account and
        choose to link this device's data to it. Until then nothing is sent to any server.
      </Text>
    </Card>
    <Card>
      <Text style={styles.rowTitle}>Not a medical tool</Text>
      <Text style={styles.body}>
        Cranium Conscious is a personal reflection companion. It does not diagnose or treat any condition.
      </Text>
    </Card>
  </Screen>
);

const loadOverview = async () => {
  const [journal, checkIns, metrics, sync, health] = await Promise.all([
    listJournalEntries(),
    listDailyCheckIns(),
    listMetricEntries(),
    getSyncStatus(),
    getStorageHealth(),
  ]);
  return {journal: journal.length, checkIns: checkIns.length, metrics: metrics.length, sync, health};
};

// Account and sync controls only exist when sign-in is enabled; Firebase is loaded lazily from the handlers below.
const SyncControls = ({status, onChanged}) => {
  const [busy, setBusy] = useState(false);
  const firebase = () => require('../../../services/firebaseconfig');
  const user = firebase().auth.currentUser;
  const needsClaim = status.reasons.includes('ownership-unclaimed');
  const needsVerify = user && !user.emailVerified;

  const run = async task => {
    setBusy(true);
    try {
      await task();
    } catch {
      Alert.alert('Could not complete that', 'Check your connection and try again. Your data on this phone is unchanged.');
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const link = () =>
    Alert.alert(
      "Link this phone's data to your account?",
      'Your journal and logs on this phone will be uploaded to your account and kept in sync. Only you can read them.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Link data', onPress: () => run(async () => { await claimLocalData(); await syncNow(); })},
      ],
    );

  return (
    <>
      <SectionTitle title="Account" />
      <Card>
        <Text style={styles.rowTitle}>{user?.email || 'Not signed in'}</Text>
        {needsVerify ? (
          <>
            <Text style={styles.body}>Verify your email to turn on cloud sync. Check your inbox for the link, then reopen this screen.</Text>
            <Button
              title="Resend verification email"
              variant="secondary"
              disabled={busy}
              onPress={() => run(async () => { await user.reload(); if (!user.emailVerified) await firebase().sendEmailVerification(user); })}
              style={{marginTop: space.md}}
            />
          </>
        ) : null}
        {!needsVerify && needsClaim ? <Button title="Link this phone's data" disabled={busy} onPress={link} style={{marginTop: space.md}} /> : null}
        {status.enabled ? <Button title="Sync now" variant="secondary" disabled={busy} onPress={() => run(syncNow)} style={{marginTop: space.md}} /> : null}
      </Card>
    </>
  );
};

export const DataScreen = () => {
  const {data: overview, error, reload} = useAsyncData(loadOverview, null);
  const later = () => Alert.alert('Coming later', 'This is not available in this version.');
  return (
    <Screen>
      <Title subtitle="Saved on this device first, so it works offline">Data management</Title>
      {error ? <Note>{READ_ERROR}</Note> : null}
      <Card>
        <Text style={styles.rowTitle}>Stored on this device</Text>
        <Text style={styles.body}>Journal entries: {overview ? overview.journal : '...'}</Text>
        <Text style={styles.body}>Daily check-ins: {overview ? overview.checkIns : '...'}</Text>
        <Text style={styles.body}>Metric entries: {overview ? overview.metrics : '...'}</Text>
      </Card>
      {overview ? <Note>{overview.sync.description}</Note> : null}
      {AUTH_ENABLED && overview ? <SyncControls status={overview.sync} onChanged={reload} /> : null}
      {overview && overview.health.corruptRecords > 0 ? (
        <Note>{overview.health.corruptRecords} stored record(s) could not be read. They were left untouched.</Note>
      ) : null}
      {overview ? overview.health.upgradeIssues.map(issue => <Note key={issue}>{issue}</Note>) : null}
      <SectionTitle title="Planned" />
      <ListRow title="Export my data" subtitle="Not available yet" icon="export-variant" color={colors.teal} onPress={later} />
      <ListRow title="Delete all data" subtitle="Not available yet" icon="delete-outline" color={colors.red} onPress={later} />
    </Screen>
  );
};

export const AboutScreen = () => (
  <Screen>
    <Title subtitle="Phase 2 prototype">About</Title>
    <Card>
      <Text style={styles.rowTitle}>Cranium Conscious</Text>
      <Text style={styles.body}>
        A privacy-first space to journal, track daily wellness, and notice patterns over time. It is a
        personal wellness companion, not a medical diagnostic tool.
      </Text>
    </Card>
    <Note>Screens marked as example or preview use placeholder content, not your data.</Note>
  </Screen>
);

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  switchRow: {flexDirection: 'row', alignItems: 'center', minHeight: 60},
  rowTitle: {color: colors.text, fontSize: 16, fontWeight: '600'},
  muted: {color: colors.textMuted, fontSize: 13, marginTop: 2},
  body: {color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: space.sm},
  label: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: space.sm},
  goalTrack: {height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginTop: space.sm},
  goalFill: {height: 8, borderRadius: 4, backgroundColor: colors.primary},
  timeRow: {flexDirection: 'row', justifyContent: 'space-around', marginTop: space.md},
  track: {height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginVertical: space.sm},
  fill: {height: 8, borderRadius: 4, backgroundColor: colors.primary},
});
