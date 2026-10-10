import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';

// `load` must be a stable function (module-level or memoized). Reloads whenever the screen gains focus.
const useAsyncData = (load, initial = null) => {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return {data, error, loaded, reload};
};

export default useAsyncData;
