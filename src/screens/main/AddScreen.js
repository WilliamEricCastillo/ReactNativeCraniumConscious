import React from 'react';
import {Screen, Title, ListRow, SectionTitle} from '../../components/ui';
import useAsyncData from '../../hooks/useAsyncData';
import {listCustomMetrics} from '../../../services/data/dataService';
import {metricColors} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';
import {todayISO} from '../../utils/dates';

const ACTIONS = [
  {title: 'Check-in', subtitle: 'Mood, energy, stress and focus', icon: 'emoticon-outline', color: metricColors.mood, route: ROUTES.checkIn},
  {title: 'Journal entry', subtitle: 'Write about your day', icon: 'notebook-edit-outline', color: metricColors.mood, route: ROUTES.journalNew, params: () => ({date: todayISO()})},
  {title: 'Water', subtitle: 'Glasses of water', icon: 'water-outline', color: metricColors.water, route: ROUTES.water},
  {title: 'Sleep', subtitle: 'Hours slept last night', icon: 'sleep', color: metricColors.sleep, route: ROUTES.sleep},
  {title: 'Exercise', subtitle: 'Minutes of activity', icon: 'run', color: metricColors.exercise, route: ROUTES.exercise},
  {title: 'Meal', subtitle: 'What and when you ate', icon: 'food-apple-outline', color: metricColors.meal, route: ROUTES.meal},
];

const AddScreen = ({navigation}) => {
  const {data: custom} = useAsyncData(listCustomMetrics, []);
  // replace keeps Back returning to the tabs instead of this list
  const open = (route, params) => () => navigation.replace(route, params);

  return (
    <Screen>
      <Title subtitle="Choose what to log">Add to Today</Title>
      {ACTIONS.map(action => (
        <ListRow
          key={action.title}
          title={action.title}
          subtitle={action.subtitle}
          icon={action.icon}
          color={action.color}
          onPress={open(action.route, action.params ? action.params() : undefined)}
        />
      ))}
      <SectionTitle title="Your metrics" />
      {custom.map(metric => (
        <ListRow
          key={metric.id}
          title={metric.name}
          subtitle={metric.unit || 'Custom metric'}
          icon="tune-variant"
          color={metricColors.custom}
          onPress={open(ROUTES.customMetric, {metricId: metric.id})}
        />
      ))}
      <ListRow
        title="Track something new"
        subtitle="Name it and log the first value"
        icon="plus-circle-outline"
        color={metricColors.custom}
        onPress={open(ROUTES.customMetric)}
      />
    </Screen>
  );
};

export default AddScreen;
