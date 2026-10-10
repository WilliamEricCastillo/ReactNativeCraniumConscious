# Cranium Conscious: User Guide

This guide describes the app as it is built now. Behaviour was checked against the source code and by using the app on an
Android emulator (check-in, water, sleep, journal, goals, reminders, Insights, calendar, and reopening the app).

## 1. What the app is

Cranium Conscious is a private wellness journal. You can:

- Check in with how you feel (mood, energy, stress, focus).
- Log sleep, exercise, water, meals, and metrics you create yourself.
- Write journal entries, with or without a prompt.
- Set simple goals and see weekly progress.
- Get gentle reminders from your phone.
- See patterns in your own logs on the Insights tab.

Everything is saved on your phone. There is no account and no cloud sync in this version (see section 7).

## 2. Screen map

The bottom bar has five items: **Today**, **Journal**, a purple **+**, **Insights** and **You**.

```
Today (opens first)
 +-- "A pattern we're noticing" -> Shortest trustworthy pattern in your recent logs, or "Keep logging"
 +-- Check-in card ---------------> Check-in (mood, energy, stress, focus)
 +-- Log today cards -------------> Water / Sleep / Exercise / Meals / your own metrics
 +-- "Choose what appears here" --> My metrics
 +-- Journal: Write / Use a prompt -> New entry / Prompts
 +-- This week (7 days) ----------> Day
 +-- "Calendar" ------------------> Journal tab, Calendar view

Journal
 +-- New entry, Prompts
 +-- List | Calendar toggle
 |     +-- List: search, mood filters, tap an entry -> Entry (Edit, Delete); pencil -> Edit entry
 |     +-- Calendar: tap a day, tap an entry, "Open day" -> Day, "Write an entry for this day"

+ (centre button) -> Add to Today
 +-- Check-in, Journal entry, Water, Sleep, Exercise, Meal
 +-- Your metrics (each custom metric), "Track something new"

Insights
 +-- Week | Month | 3 Months | Year
 +-- Trend cards -> Trend      +-- "What affects your mood" -> Factor / Mood factors

You
 +-- Goals            +-- My metrics -> Metric, New metric      +-- Reminders
 +-- Privacy          +-- Data management                       +-- Settings     +-- About

Day (any date): Previous / Next day, journal entries, daily metrics (tap to add or edit), Remove
```

## 3. Every screen

### Bottom tabs

| Screen | How to open it | What it does |
|---|---|---|
| Today | Tab "Today" | Your day at a glance: check-in, tracked metrics, today's journal, and a brief pattern card from your recent logs when enough data is available. |
| Journal | Tab "Journal" | Write entries, browse prompts, search and filter entries, or switch to a calendar. |
| Add to Today | Purple **+** | One menu for everything you can log. Back returns to the tab you were on. |
| Insights | Tab "Insights" | Trends, a summary and mood factors calculated from your logs. |
| You | Tab "You" | Your journey stats, goals, metrics, reminders, privacy, data, settings and About. |

### Logging screens

All of these log for **today**, unless you opened them from a past day's screen, in which case the header shows that date
and the value is saved for that date.

| Screen | How to open it | What it does |
|---|---|---|
| Check-in | Today > Check-in card, or + > Check-in | Set mood, energy, stress and focus together. Choose at least one, then Save. |
| Mood, Energy, Stress, Focus | Day > the matching row | Set one value for that date. |
| Sleep | Today > Sleep, + > Sleep, or Day > Sleep | Hours slept in 0.5-hour steps. One value per day; saving again replaces it. |
| Exercise | Today > Exercise, + > Exercise, or Day > Exercise | Type (Walk, Run, Strength, Yoga, Other) and minutes. One value per day. |
| Water | Today > Water, + > Water, or Day > Water | Total glasses for the day (1 glass = 250 ml). Saving sets the total. Shows ml or oz too if you chose those in Settings. |
| Meal | Today > Meals, or + > Meal | Meal type and a short description. Every save adds a meal. |
| Your own metric | Today card, or + > the metric name | Logs a value using the right input for its type: a number, a 1-5 scale or Yes/No. |
| Track something new | + > Track something new | Type a name, a number and an optional unit. The metric is created (or reused if the name exists) and the value logged. |

After you tap Save the screen closes and you return to where you were. Cancel closes without saving.

### Journal screens

| Screen | How to open it | What it does |
|---|---|---|
| New entry | Journal > New entry, Today > Write, + > Journal entry | Write text and pick a mood (both required). |
| Prompts / Prompt entry | Journal > Prompts, or Today > Use a prompt | Ten prompts in four groups. Tapping one starts an entry with the prompt shown. |
| List | Journal > List | Entries by date, newest first. Search text; filter All / Positive (mood 4-5) / Neutral (3) / Low (1-2). |
| Calendar | Journal > Calendar, or Today > This week > Calendar | Month view in the app's purple style. A dot marks days with any logs. Tap a day to see its entries; tap an entry to open it. |
| Entry | Tap an entry | Shows mood, prompt (if any) and text. Edit entry or Delete entry (asks to confirm). |
| Edit entry | Pencil icon, or Entry > Edit entry | Change text and mood. Date and time cannot be changed. |
| Day | Today > a day in This week; Calendar > Open day; Insights > a logged day | One date's journal entries and metrics. Previous / Next day move between dates. Tap a metric row to add or change it for that date. **Remove** deletes a saved sleep, exercise or water value; meals and other metrics can be removed too. "Write an entry for this day" adds a journal entry for that date. |

### Insights screens

| Screen | How to open it | What it does |
|---|---|---|
| Insights | Tab "Insights" | Pick Week (7 days), Month (30), 3 Months (90) or Year (365). Shows days logged, journal entries, average mood and a card per metric that has data. |
| Trend | Tap a trend card | Larger chart, average, lowest and highest, whether the trend is up, down or steady (needs at least 4 logged days), and the days you logged. Tap a day to open it. |
| Personalized patterns | Insights | After at least 28 days and enough matched observations, the app can show brief, preliminary pattern cards such as sleep vs. mood or stress vs. focus. If the data is sparse, inconsistent or weak, it suppresses the claim and shows honest guidance instead. |
| Mood factors / Factor | Insights > "View all" or a factor row | Compares your average mood on days with and without exercise, 7+ hours of sleep, 8+ glasses of water, 3+ meals, or high stress (4-5). Appears only when there are at least 3 days of each. |

### You screens

| Screen | How to open it | What it does |
|---|---|---|
| Your journey card | Top of You | Day streak (consecutive days with any log, counting back from today or yesterday), journal entries, days logged. |
| Goals | You > Goals | Turn goals on or off and see this week's progress (section 4). |
| My metrics | You > My metrics, or Today > Choose what appears here | Switches choose what appears on Today. "Add custom metric" creates one. Tap a metric for details; custom metrics can be renamed or archived (hidden, past values kept). |
| Reminders | You > Reminders | Turn reminders on, change their time, and see whether they are really scheduled (section 4). |
| Privacy | You > Privacy | Where your data lives and a "not a medical tool" notice. |
| Data management | You > Data management | Counts of what is stored, sync status, and any records that could not be read. "Export my data" and "Delete all data" are not built yet. |
| Settings | You > Settings | Water units (glasses, ml, oz), week start (Monday, Sunday, Saturday) and a note that Dark is the only theme. |
| About | You > About | Short description of the app. |

## 4. How to use each feature

### Mood and check-ins

1. On **Today**, tap the **Check-in** card.
2. Choose a mood face and, if you like, energy, stress and focus (1 to 5).
3. Tap **Save**.

The card then shows your mood and the three numbers. Checking in again the same day changes only the values you touch.
If you have no check-in mood but wrote a journal entry today, the card shows the mood from your latest journal entry and says so.
The same rule is used on the Day screen and in Insights, so the numbers agree everywhere.

### Journal

1. Open **Journal > New entry** (or **Today > Write**).
2. Write your text and pick a mood. Text is required; without a mood you get an error when you tap Submit.
3. Tap **Submit**.

Unsaved writing is kept on the device and restored the next time you open the same entry ("Restored your unsaved writing.").
Entries can be up to 50,000 characters.

### Metrics and custom metrics

Today shows cards for the metrics you have switched on in **My metrics**: Water, Sleep, Exercise, Meals and each custom metric.
To track something of your own, use **You > My metrics > Add custom metric** (choose Number, Scale 1-5 or Yes/No) or **+ > Track something new**.
Switch a metric off in My metrics to hide its Today card; its saved values are kept.

### Goals

Open **You > Goals** and tap the goals you want. Progress is calculated for the current week (the week starts on the day set in Settings):

| Goal | What counts |
|---|---|
| Sleep 7+ hours | Days this week with 7 or more hours of sleep logged. |
| Move every day | Days this week with any exercise logged. |
| Journal 3 times a week | Journal entries since the week started, out of 3. |
| Drink more water | Days with 8 or more glasses (2 litres) logged. |
| Lower daily stress | Logged days with stress 1 or 2 out of 5. |

When nothing has been logged yet the card says so instead of showing a made-up number.

### Reminders

1. Open **You > Reminders**. If notifications are not allowed yet, tap **Allow notifications** and accept Android's prompt.
   If you refused, the screen offers **Open settings**.
2. Switch on **Morning check-in** (9:00 AM every day), **Evening journal** (8:30 PM every day) or **Weekly review** (Sunday 6:00 PM).
3. Tap **Change time** to pick a different time.

Each reminder shows its real state: **Off**, **Scheduled** (Android has it queued), **Not scheduled**, or **Waiting for notification permission**.
Reminders are sent by your phone, not a server. Android can delay them slightly to save battery. They are re-applied each time the app opens.

### Insights

Pick a range at the top. Insights use only what you logged: a day with no record is shown as an empty grey stub, not as zero.
If you logged nothing in the range you see "Nothing to show yet". Factors and the key insight need enough days (3 with and 3 without) and are
labelled as associations, not causes.

## 5. Moving around

- **Between sections:** tap the tabs. Today > "Calendar" jumps to the Journal calendar.
- **Back:** screens opened from a tab have a back arrow at the top left; Android's Back button does the same. Tab screens have no arrow.
- **After saving:** logging and journal screens close by themselves.
- **Add to Today** slides up; choosing an item replaces it, so Back returns to the tab you were on.
- The tab bar is hidden on detail screens. Go back to see it again.

## 6. How data is saved

- Everything is saved on your phone the moment you tap Save, and works offline. It is still there after you close and reopen the app.
- Each record is stored separately, so one damaged record cannot block the rest. Unreadable records are left in place and reported on Data management.
- Journal entries from the earlier version of the app were copied in once. The originals are never changed or removed.
- Unsaved journal text is kept as a device-only draft.
- Uninstalling the app or clearing its storage deletes your data. There is no export or backup yet.

## 7. Cloud sync and accounts

Cloud sync and sign-in are **built but switched off** (three flags in `src/config/features.js`). Nothing leaves your phone.
The code has been tested against an in-memory cloud (uploads, conflicts, deletes, reinstall recovery, account isolation) and the proposed
security rules have been tested in the local Firestore emulator, but the rules are not published and nothing has been enabled.
See the go-live checklist in `docs/data-schema.md` for the steps that need you.

## 8. Feature status

| Feature | Status | Notes |
|---|---|---|
| Today dashboard | Complete | Real data; shows the metrics you track, including custom ones. |
| Check-in (mood, energy, stress, focus) | Complete | One mood per day shown consistently everywhere. |
| Sleep, exercise, water | Complete | Any date via Day; one value per day; removable on Day. |
| Meals, custom metrics | Complete | Custom metrics log by type and appear on Today. |
| Journal (write, edit, delete, search, filter, prompts) | Complete | Mood and text required; autosaved drafts. |
| Calendar | Complete | Purple style, dots for logged days, opens entries and Day. |
| Day screen | Complete | Reachable from the week strip, calendar and Insights. |
| Goals | Complete | All five presets calculate weekly progress. |
| My metrics | Complete | Switches control Today; custom metrics can be created, edited, archived. |
| Insights, trends, mood factors | Complete | Calculated from your records; honest empty states. |
| Reminders | Complete | Real permission handling and scheduling; status read from Android. Fixed to three presets with editable time. |
| Settings: water units, week start | Complete | Units change display only. |
| Settings: appearance | Informational | Dark is the only theme. |
| Privacy, About | Complete | Text only. |
| Data management: counts and status | Complete | |
| Export my data, Delete all data | Not built | Show "Coming later". |
| Cloud sync, sign-in | Built, disabled | Needs the go-live steps. |

## 9. Known limitations

- Reminders cannot be created freely: there are three presets, and only their time can be changed.
- Check-in values cannot be cleared once set; they can only be changed.
- Water is stored in glasses; ml and oz are conversions for display.
- Insights compares averages over your own days. With few logged days it shows less, not guesses.
- No export or delete-all yet.
- Notifications need Android's permission and may arrive a little late when the phone is saving battery.

## 10. First-day walkthrough

1. **Open the app.** You land on **Today**. The Check-in card says "Check in".
2. **Check in.** Tap the card, tap a face, set energy, stress and focus if you like, then **Save**. Today now shows your mood.
3. **Log water.** Tap the **Water** card, use + and - to set glasses so far, then **Save**. Come back later to raise the total.
4. **Log sleep.** Tap **Sleep**, set last night's hours, then **Save**.
5. **Add a meal.** Tap the purple **+**, choose **Meal**, pick a type, describe it, then **Save**.
6. **Write a journal entry.** Tap **Write** on Today (or Journal > New entry), write a few lines, pick a mood, then **Submit**.
7. **Pick goals.** **You > Goals**, tap the ones you care about, and see this week's progress.
8. **Turn on a reminder.** **You > Reminders > Allow notifications**, then switch on **Morning check-in**.
9. **Look back.** Open **Journal > Calendar** and tap today, or tap a day under **This week** on Today.
10. **Tomorrow.** Check **Insights**. With a few days of logs the charts and factors begin to fill in.
