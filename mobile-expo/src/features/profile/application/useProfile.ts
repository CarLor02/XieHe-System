import { useCallback, useState } from 'react';
import { getApiErrorMessage } from '@xiehe/api-client';
import type { MobileServices } from '../../../application/services';
import { useResource } from '../../../shared/hooks/useResource';

export function useProfile(
  dashboard: Pick<MobileServices['dashboard'], 'getStats'>,
  signOut: () => Promise<void>
) {
  const stats = useResource(
    useCallback(() => dashboard.getStats(), [dashboard])
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return { stats, busy, error, logout };
}
