import React from 'react';
import {Screen, Title, ListRow} from '../../components/ui';
import {metricColors} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';
import {todayISO} from '../../utils/dates';

const ACTIONS = [
  {title: 'Check-in', subtitle: 'Mood, energy, stress and focus', icon: 'emoticon-outline', color: metricColors.mood, route: ROUTES.checkIn},
  {title: 'Sleep', subtitle: 'Hours slept last night', icon: 'sleep', color: metricColors.sleep, route: ROUTES.sleep},
  {title: 'Exercise', subtitle: 'Minutes of activity', icon: 'run', color: metricColors.exercise, route: ROUTES.exercise},
  {title: 'Water', subtitle: 'Glasses of water', icon: 'water-outline', color: metricColors.water, route: ROUTES.water},
  {title: 'Meal', subtitle: 'What and when you ate', icon: 'food-apple-outline', color: metricColors.meal, route: ROUTES.meal},
  {title: 'Journal', subtitle: 'Write a new entry', icon: 'notebook-edit-outline', color: metricColors.mood, route: ROUTES.journalNew},
  {title: 'Custom metric', subtitle: 'Track something of your own', icon: 'tune-variant', color: metricColors.custom, route: ROUTES.customMetric},
];

const AddScreen = ({navigation}) => (
  <Screen>
    <Title subtitle="Choose what to log">Add to Today</Title>
    {ACTIONS.map(action => (
      <ListRow
        key={action.title}
        title={action.title}
        subtitle={action.subtitle}
        icon={action.icon}
        color={action.color}
        // replace keeps Back returning to the tabs instead of this list
        onPress={() =>
          navigation.replace(
            action.route,
            action.route === ROUTES.journalNew ? {date: todayISO()} : undefined,
          )
        }
      />
    ))}
  </Screen>
);

export default AddScreen;
