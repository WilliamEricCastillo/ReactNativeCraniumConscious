// Logical route -> React Navigation screen name. This project uses React Navigation (not Expo Router),
// so each URL-style route from the spec is a screen name that mirrors the path:
//   /(tabs)/today -> tab "today"      /(tabs)/journal -> tab "journal"   /(tabs)/insights -> tab "insights"
//   /(tabs)/you -> tab "you"          /add -> stack "add" (opened by the centre "+" tab)
//   /log/<x> -> "log/<x>"             /journal/new -> "journal/new"      /day/[date] -> "day/[date]"
//   /journal/[entryId] -> "journal/[entryId]" (param: entryId), and likewise for the other dynamic routes
//   (factorId, metricId, date). Settings sub-pages follow the same naming ("you/settings/appearance", ...).
export const ROUTES = {
  tabs: 'Tabs',
  today: 'today',
  journal: 'journal',
  insights: 'insights',
  you: 'you',
  addTab: 'addTab',
  add: 'add',

  checkIn: 'log/check-in',
  mood: 'log/mood',
  energy: 'log/energy',
  stress: 'log/stress',
  focus: 'log/focus',
  sleep: 'log/sleep',
  exercise: 'log/exercise',
  water: 'log/water',
  meal: 'log/meal',
  customMetric: 'log/custom-metric',

  journalNew: 'journal/new',
  journalPrompts: 'journal/prompts',
  journalNewPrompt: 'journal/new/prompt',
  journalEntry: 'journal/[entryId]',
  journalEdit: 'journal/[entryId]/edit',
  legacyCalendar: 'journal/calendar',

  moodFactors: 'insights/mood-factors',
  factor: 'insights/factor/[factorId]',
  trend: 'insights/trend/[metricId]',

  goals: 'you/goals',
  metrics: 'you/metrics',
  metricNew: 'you/metrics/new',
  metric: 'you/metrics/[metricId]',
  reminders: 'you/reminders',
  privacy: 'you/privacy',
  data: 'you/data',
  settings: 'you/settings',
  appearance: 'you/settings/appearance',
  notifications: 'you/settings/notifications',
  units: 'you/settings/units',
  weekStart: 'you/settings/week-start',
  about: 'you/about',

  day: 'day/[date]',
};
