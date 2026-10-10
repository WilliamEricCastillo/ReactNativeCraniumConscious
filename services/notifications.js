import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';

import {listReminders} from './data/dataService';
import {buildTriggers, contentFor, reminderIdOf} from './reminderSchedule';

// Local reminders only. Nothing here talks to a server, and the status it reports comes from the operating system
// (permission) and from the notifications it actually has scheduled, not from the saved on/off switch.

const CHANNEL_ID = 'reminders';

export const initNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false}),
  });
};

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

// 'granted' | 'undetermined' (can still ask) | 'blocked' (the user must change it in system settings)
export const getPermission = async () => {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.status === 'undetermined' || p.canAskAgain ? 'undetermined' : 'blocked';
};

export const requestPermission = async () => {
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'blocked';
};

const scheduledFor = async () => {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map(n => ({identifier: n.identifier, reminderId: reminderIdOf(n.identifier)}));
};

// Reminder ids that currently have at least one notification scheduled with the system.
export const getScheduledReminderIds = async () => new Set((await scheduledFor()).map(s => s.reminderId));

const cancelFor = async reminderId => {
  const mine = (await scheduledFor()).filter(s => s.reminderId === reminderId);
  await Promise.all(mine.map(s => Notifications.cancelScheduledNotificationAsync(s.identifier)));
};

// Makes the system match the saved reminder. Returns 'scheduled', 'off' or 'blocked' (no permission).
export const applyReminder = async reminder => {
  await cancelFor(reminder.id);
  if (!reminder.enabled) return 'off';
  if ((await getPermission()) !== 'granted') return 'blocked';
  await ensureChannel();
  const content = contentFor(reminder);
  for (const {id, trigger} of buildTriggers(reminder)) {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {title: content.title, body: content.body},
      trigger: Platform.OS === 'android' ? {...trigger, channelId: CHANNEL_ID} : trigger,
    });
  }
  return 'scheduled';
};

// Re-applies every saved reminder and removes scheduled notifications whose reminder no longer exists.
export const syncReminders = async reminders => {
  const known = new Set(reminders.map(r => r.id));
  for (const {identifier, reminderId} of await scheduledFor()) {
    if (!known.has(reminderId)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  for (const reminder of reminders) await applyReminder(reminder);
};

// Runs at launch so reminders survive a reinstall of the schedule, a time zone change or a reboot.
export const syncRemindersOnLaunch = async () => {
  try {
    if ((await getPermission()) !== 'granted') return;
    await syncReminders(await listReminders());
  } catch {
    // Reminders are best-effort at launch; the Reminders screen shows the real status.
  }
};
