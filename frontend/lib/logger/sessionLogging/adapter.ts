import {
  extractApiMessage,
  getStatusCode,
} from '@/lib/api/types';
import type {
  SessionUser,
  UserSession,
} from '@/lib/api/session/userSession';
import { createLogger } from '../logger';

type FetchUserInfoStatus = 'success' | 'unauthorized' | 'error';

type SessionLogContext = Record<string, unknown> | undefined;

const storeLogger = createLogger('session.store');
const initializerLogger = createLogger('session.initializer');
const refreshLockLogger = createLogger('session.refreshLock');
const authenticatedClientLogger = createLogger('session.authenticatedClient');
const fetchClientLogger = createLogger('session.fetchClient');

function buildSessionSnapshot(
  session: UserSession | null | undefined
): Record<string, unknown> {
  if (!session) {
    return { hasSession: false };
  }

  const expiresAtEpochSeconds = session.accessTokenExpiresAtEpochSeconds;
  const expiresAtIso = expiresAtEpochSeconds
    ? new Date(expiresAtEpochSeconds * 1000).toISOString()
    : null;
  const remainingMs = expiresAtEpochSeconds
    ? expiresAtEpochSeconds * 1000 - Date.now()
    : null;

  return {
    hasSession: true,
    hasAccessToken: Boolean(session.accessToken),
    hasRefreshToken: Boolean(session.refreshToken),
    expiresAtEpochSeconds,
    expiresAtIso,
    remainingMs,
  };
}

function buildErrorSummary(error: unknown): Record<string, unknown> {
  return {
    status: getStatusCode(error),
    message:
      extractApiMessage((error as { response?: { data?: unknown } })?.response?.data) ||
      (error as { message?: string })?.message ||
      'Unknown error',
  };
}

function getCurrentRoute(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return `${window.location.pathname}${window.location.search}`;
}

export const sessionStoreLogging = {
  loginRequested(input: { username: string; rememberMe: boolean }) {
    storeLogger.info('login request', input);
  },

  loginSucceeded(user: SessionUser) {
    storeLogger.info('login success', {
      userId: user.id,
      username: user.username,
      role: user.role,
    });
  },

  loginFailed(error: unknown) {
    storeLogger.warn('login failed', buildErrorSummary(error));
  },

  registerFailed(error: unknown) {
    storeLogger.warn('register failed', buildErrorSummary(error));
  },

  logoutRequested(session: UserSession | null | undefined) {
    storeLogger.info('logout requested', {
      ...buildSessionSnapshot(session),
      hasAccessTokenForLogout: Boolean(session?.accessToken),
    });
  },

  logoutRequestFailed(error: unknown) {
    storeLogger.warn('logout request failed', buildErrorSummary(error));
  },

  refreshRequested(session: UserSession | null | undefined) {
    storeLogger.info('refresh token request', buildSessionSnapshot(session));
  },

  refreshSucceeded(session: UserSession | null | undefined) {
    storeLogger.info('refresh token success', buildSessionSnapshot(session));
  },

  refreshFailed(input: {
    error: unknown;
    session: UserSession | null | undefined;
  }) {
    storeLogger.warn('refresh token failed', {
      ...buildErrorSummary(input.error),
      session: buildSessionSnapshot(input.session),
    });
  },

  forceLogout(input: {
    context?: SessionLogContext;
    session: UserSession | null | undefined;
  }) {
    storeLogger.warn('force logout', {
      context: input.context,
      route: getCurrentRoute(),
      session: buildSessionSnapshot(input.session),
    });
  },

  fetchUserInfoSkipped(input: {
    isAuthenticated: boolean;
    session: UserSession | null | undefined;
  }) {
    storeLogger.debug('fetchUserInfoStatus skipped: no usable session', {
      isAuthenticated: input.isAuthenticated,
      session: buildSessionSnapshot(input.session),
    });
  },

  fetchUserInfoRestoredAuthenticatedFlag() {
    storeLogger.info('fetchUserInfoStatus restoring authenticated flag from session');
  },

  fetchUserInfoSucceeded(user: SessionUser) {
    storeLogger.debug('fetchUserInfoStatus success', {
      userId: user.id,
      username: user.username,
    });
  },

  fetchUserInfoFailed(input: {
    error: unknown;
    session: UserSession | null | undefined;
  }) {
    storeLogger.warn('fetchUserInfo failed', {
      ...buildErrorSummary(input.error),
      session: buildSessionSnapshot(input.session),
    });
  },

  updateUserInfoFailed(error: unknown) {
    storeLogger.warn('updateUserInfo failed', buildErrorSummary(error));
  },

  rehydrateMerged(input: {
    persistedSession: UserSession | null | undefined;
    mergedSession: UserSession | null | undefined;
    mergedIsAuthenticated: boolean;
  }) {
    storeLogger.debug('rehydrate merge session', {
      persistedHasSession: Boolean(input.persistedSession?.accessToken && input.persistedSession?.refreshToken),
      mergedIsAuthenticated: input.mergedIsAuthenticated,
      session: buildSessionSnapshot(input.mergedSession),
    });
  },
};

export const sessionInitializerLogging = {
  persistApiUnavailable() {
    initializerLogger.debug('persist api unavailable, marking hydrated');
  },

  persistAlreadyHydrated() {
    initializerLogger.debug('persist already hydrated');
  },

  persistHydrationStarted() {
    initializerLogger.debug('persist hydration started');
  },

  persistHydrationFinished(input: { isAuthenticated: boolean }) {
    initializerLogger.debug('persist hydration finished', input);
  },

  initializeStarted(input: {
    isAuthenticated: boolean;
    hasStoredSession: boolean;
    accessTokenExpiresAtEpochSeconds: number | null | undefined;
    session: UserSession | null | undefined;
  }) {
    initializerLogger.info('initialize auth start', {
      isAuthenticated: input.isAuthenticated,
      hasStoredSession: input.hasStoredSession,
      accessTokenExpiresAtEpochSeconds: input.accessTokenExpiresAtEpochSeconds,
      session: buildSessionSnapshot(input.session),
    });
  },

  initializeStatus(status: FetchUserInfoStatus) {
    initializerLogger.info('initialize auth user info status', { status });
  },

  initializeRefreshAttempt() {
    initializerLogger.warn('initialize auth encountered unauthorized, attempting refresh');
  },

  initializeRefreshResult(refreshed: boolean) {
    initializerLogger.info('initialize auth refresh result', { refreshed });
  },

  initializePostRefreshStatus(status: FetchUserInfoStatus) {
    initializerLogger.info('initialize auth post-refresh user info status', {
      status,
    });
  },

  initializeForceLogout(status: FetchUserInfoStatus) {
    initializerLogger.warn('token validation failed, clearing auth state', {
      status,
    });
  },

  initializeFailed(error: unknown) {
    initializerLogger.error('failed to initialize auth', error);
  },

  initializeFinished() {
    initializerLogger.debug('initialize auth finished');
  },

  scheduledRefreshPlanned(input: {
    accessTokenExpiresAtEpochSeconds: number;
    delayMs: number;
    refreshLeadTimeMs: number;
  }) {
    initializerLogger.debug('scheduling token refresh', input);
  },

  scheduledRefreshTriggered() {
    initializerLogger.info('scheduled token refresh triggered');
  },

  scheduledRefreshFailed(error: unknown) {
    initializerLogger.error('scheduled token refresh failed', error);
  },

  resumeCheck(input: {
    remainingMs: number;
    refreshLeadTimeMs: number;
  }) {
    initializerLogger.debug('resume visibility/focus check', input);
  },

  resumeRefreshTriggered() {
    initializerLogger.info('resume-triggered token refresh');
  },

  resumeRefreshFailed(error: unknown) {
    initializerLogger.error('resume token refresh failed', error);
  },
};

export const sessionRefreshLockLogging = {
  started() {
    refreshLockLogger.debug('starting refresh');
  },

  joined() {
    refreshLockLogger.debug('joining in-flight refresh');
  },

  settled() {
    refreshLockLogger.debug('refresh settled');
  },
};

export const sessionAuthenticatedClientLogging = {
  unauthorizedRetryStarted(input: {
    url?: string;
    method?: string;
    isAuthenticated: boolean;
    session: UserSession | null | undefined;
  }) {
    authenticatedClientLogger.info('401 received, attempting refresh', {
      url: input.url,
      method: input.method,
      isAuthenticated: input.isAuthenticated,
      hasSession: Boolean(input.session?.accessToken && input.session?.refreshToken),
      hasRefreshToken: Boolean(input.session?.refreshToken),
    });
  },

  unauthorizedWithoutSession(url?: string) {
    authenticatedClientLogger.warn('401 received without a usable local session', {
      url,
    });
  },

  retryingRequest(input: { url?: string; method?: string }) {
    authenticatedClientLogger.info('refresh succeeded, retrying request', input);
  },

  refreshRequestFailed(error: unknown) {
    authenticatedClientLogger.warn(
      'refresh request failed, keeping session intact',
      error
    );
  },

  refreshFailedForcingLogout(input: { url?: string; method?: string; status?: number }) {
    authenticatedClientLogger.warn('refresh failed, forcing logout', input);
  },

  retryStillUnauthorized(input: { url?: string; method?: string; status?: number }) {
    authenticatedClientLogger.warn('request still unauthorized after refresh', input);
  },
};

export const sessionFetchClientLogging = {
  unauthorizedRetryStarted(input: {
    request: string;
    session: UserSession | null | undefined;
  }) {
    fetchClientLogger.info('fetch 401, attempting refresh', {
      input: input.request,
      hasRefreshToken: Boolean(input.session?.refreshToken),
    });
  },

  refreshFailed(error: unknown) {
    fetchClientLogger.warn('fetch refresh failed, keeping session intact', error);
  },

  authErrorHandled(error: unknown) {
    fetchClientLogger.warn('auth error', buildErrorSummary(error));
  },
};
