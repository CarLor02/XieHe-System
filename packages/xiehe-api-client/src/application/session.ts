export interface TokenProvider {
  getAccessToken(): string | null | Promise<string | null>;
}

export interface SessionRefreshResult {
  accessToken: string;
}

export type RefreshSession = () => Promise<SessionRefreshResult | null>;
export type UnauthorizedHandler = (error: unknown) => void | Promise<void>;

export interface ApiClientLogger {
  debug?(message: string, context?: Record<string, unknown>): void;
  warn?(message: string, context?: Record<string, unknown>): void;
  error?(message: string, context?: Record<string, unknown>): void;
}
