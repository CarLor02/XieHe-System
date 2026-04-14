import { sessionRefreshLockLogging } from '@/lib/logger/sessionLogging';
import { useSessionStore } from '@/lib/api';

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessTokenWithLock(): Promise<boolean> {
  if (!refreshPromise) {
    sessionRefreshLockLogging.started();
    refreshPromise = useSessionStore
      .getState()
      .refreshAccessToken()
      .finally(() => {
        sessionRefreshLockLogging.settled();
        refreshPromise = null;
      });
  } else {
    sessionRefreshLockLogging.joined();
  }

  return refreshPromise;
}
