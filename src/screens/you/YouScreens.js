import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, Switch, Alert} from 'react-native';

import {Screen, Title, Card, Button, Chip, Field, FormActions, ListRow, Note, SectionTitle, EmptyState} from '../../components/ui';
import useAsyncData from '../../hooks/useAsyncData';
import {
  listGoals,
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
  listJournalEntries,
  listDailyCheckIns,
  listMetricEntries,
  getSyncStatus,
  getStorageHealth,
} from '../../../services/data/dataService';
import {DataValidationError} from '../../../services/data/models';
import {METRIC_INFO, getMetricInfo} from '../../data/sample';
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

export const GoalsScreen = () => {
  const {data: goals, error, reload} = useAsyncData(listGoals, []);

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
      <Title subtitle="Manage what you log each day">Tracked metrics</Title>
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
          actionLabel="Tracked metrics"
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

const REMINDER_PRESETS = [
  {label: 'Morning check-in', kind: 'check-in', time: '09:00', subtitle: '9:00 AM'},
  {label: 'Evening journal', kind: 'journal', time: '20:30', subtitle: '8:30 PM'},
  {label: 'Weekly review', kind: 'weekly-review', time: '18:00', subtitle: 'Sunday, 6:00 PM', daysOfWeek: [0]},
];

export const RemindersScreen = () => {
  const {data: reminders, error, reload} = useAsyncData(listReminders, []);

  const toggle = async (preset, enabled) => {
    try {
      const {subtitle, ...input} = preset;
      await setReminderPreset(input, enabled);
      await reload();
    } catch (e) {
      reportError(e);
    }
  };

  return (
    <Screen>
      <Title subtitle="Gentle nudges, never pressure">Reminders</Title>
      {error ? <Note>{READ_ERROR}</Note> : null}
      <Card>
        {REMINDER_PRESETS.map(p => (
          <SwitchRow
            key={p.label}
            title={p.label}
            subtitle={p.subtitle}
            value={!!reminders.find(r => r.label === p.label)?.enabled}
            onValueChange={value => toggle(p, value)}
          />
        ))}
      </Card>
      <Note>Your choices are stored, but no notifications are scheduled yet.</Note>
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

export const DataScreen = () => {
  const {data: overview, error} = useAsyncData(loadOverview, null);
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
});
