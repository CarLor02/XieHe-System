import * as SecureStore from 'expo-secure-store';

export interface MobileSessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface MobileSessionTokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  save(tokens: MobileSessionTokens): Promise<void>;
  clear(): Promise<void>;
}

const ACCESS_TOKEN_KEY = 'xiehe.session.access-token';
const REFRESH_TOKEN_KEY = 'xiehe.session.refresh-token';

export function createSecureSessionTokenStore(): MobileSessionTokenStore {
  return {
    getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    async save(tokens) {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
      ]);
    },
    async clear() {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
    },
  };
}
