import type { LoginCredentials, SessionUser } from '@xiehe/api-contracts';

export interface SessionTokenStore {
  getAccessToken(): Promise<string | null>;
  save(tokens: { accessToken: string; refreshToken: string }): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthenticationGateway {
  login(credentials: LoginCredentials): Promise<{
    access_token: string;
    refresh_token: string;
    user: SessionUser;
  }>;
  logout(options: {
    headers: Record<string, string>;
    timeout: number;
  }): Promise<unknown>;
}

export interface AuthenticationSession {
  auth: AuthenticationGateway;
  tokens: SessionTokenStore;
}
