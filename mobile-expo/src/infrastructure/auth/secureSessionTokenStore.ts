import * as SecureStore from 'expo-secure-store';
import {
  createBoundSessionTokenStore,
  parseStoredSession,
  type MobileSessionTokenStore,
} from './sessionTokens';

const SESSION_KEY = 'xiehe.session.v1';

export async function readSavedApiBaseUrl(): Promise<string | null> {
  return (
    parseStoredSession(await SecureStore.getItemAsync(SESSION_KEY))
      ?.apiBaseUrl ?? null
  );
}

export function createSecureSessionTokenStore(
  apiBaseUrl: string
): MobileSessionTokenStore {
  return createBoundSessionTokenStore(apiBaseUrl, {
    read: () => SecureStore.getItemAsync(SESSION_KEY),
    write: value => SecureStore.setItemAsync(SESSION_KEY, value),
    remove: () => SecureStore.deleteItemAsync(SESSION_KEY),
  });
}
