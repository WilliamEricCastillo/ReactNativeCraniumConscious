import {useCallback} from 'react';
import useAsyncData from './useAsyncData';
import {getRangeData} from '../../services/data/dataService';
import {buildDays, rangeFor} from '../utils/analytics';
import {todayISO} from '../utils/dates';

// Daily rows for the chosen range, rebuilt from saved records whenever the screen gains focus.
const useRangeDays = rangeId => {
  const load = useCallback(async () => {
    const {from, to} = rangeFor(rangeId, todayISO());
    const data = await getRangeData({from, to});
    return {rangeId, from, to, days: buildDays(data, from, to)};
  }, [rangeId]);
  return useAsyncData(load, null);
};

export default useRangeDays;
