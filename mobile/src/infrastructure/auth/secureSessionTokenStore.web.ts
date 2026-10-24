import {
  createBoundSessionTokenStore,
  parseStoredSession,
  type MobileSessionTokenStore,
} from './sessionTokens';

// The browser is a UI preview. Keep its tokens in memory instead of localStorage.
let session: string | null = null;
export async function readSavedApiBaseUrl() {
  return parseStoredSession(session)?.apiBaseUrl ?? null;
}
export function createSecureSessionTokenStore(
  apiBaseUrl: string
): MobileSessionTokenStore {
  return createBoundSessionTokenStore(apiBaseUrl, {
    read: async () => session,
    async write(value) {
      session = value;
    },
    async remove() {
      session = null;
    },
  });
}
