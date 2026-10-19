import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getApiErrorMessage } from '@xiehe/api-client';

export function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const next = await loader();
      if (id === requestId.current) setData(next);
    } catch (cause) {
      if (id === requestId.current) setError(getApiErrorMessage(cause));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [loader]);

  useFocusEffect(
    useCallback(() => {
      // A changed query must never leave the previous patient's/list's data on screen.
      setData(undefined);
      void reload();
      return () => {
        requestId.current += 1;
      };
    }, [reload])
  );

  return { data, error, loading, reload };
}
