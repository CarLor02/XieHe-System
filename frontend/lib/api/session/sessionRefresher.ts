import { createLogger } from '@/lib/logger';
import { useSessionStore } from '@/lib/api';

const logger = createLogger('api.sessionRefresher');

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessTokenWithLock(): Promise<boolean> {
  if (!refreshPromise) {
    logger.debug('starting refresh');
    refreshPromise = useSessionStore
      .getState()
      .refreshAccessToken()
      .finally(() => {
        logger.debug('refresh settled');
        refreshPromise = null;
      });
  } else {
    logger.debug('joining in-flight refresh');
  }

  return refreshPromise;
}
