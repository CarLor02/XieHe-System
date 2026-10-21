import { useSessionStore } from './sessionStore';

export function refreshAccessTokenWithLock(): Promise<boolean> {
  return useSessionStore.getState().refreshAccessToken();
}
