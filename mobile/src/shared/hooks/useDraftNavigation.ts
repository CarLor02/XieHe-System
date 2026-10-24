import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';

export function useDraftNavigation(dirty: boolean, busy: boolean) {
  const navigation = useNavigation();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [allowed, setAllowed] = useState(false);
  usePreventRemove(!allowed && (dirty || busy), ({ data }) => {
    if (!busy) setPending(() => () => navigation.dispatch(data.action));
  });
  useEffect(() => {
    if (allowed && pending) pending();
  }, [allowed, pending]);
  return {
    open: !!pending && !allowed,
    cancel: () => setPending(null),
    discard: () => setAllowed(true),
  };
}
