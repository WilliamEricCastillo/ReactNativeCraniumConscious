import {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {getDaySnapshot} from '../../services/data/dataService';

// Loads a day's saved records each time the screen gains focus. `reload` re-reads after an edit.
const useDaySnapshot = date => {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(false);

  // Drop the previous day's data immediately so it is never shown under the new date.
  useEffect(() => {
    setSnapshot(null);
  }, [date]);

  const load = useCallback(() => {
    let active = true;
    getDaySnapshot(date)
      .then(next => {
        if (active) {
          setSnapshot(next);
          setError(false);
        }
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [date]);

  useFocusEffect(load);

  return {snapshot, error, reload: load};
};

export default useDaySnapshot;
