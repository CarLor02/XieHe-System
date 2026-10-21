import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { createUserSession } from '@xiehe/auth-core';
import type { SessionUser } from '@xiehe/api-contracts';

jest.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
jest.mock('@/application/maintenance/legacyAnnotationBackupCleanup', () => ({
  runLegacyAnnotationBackupCleanup: jest.fn(),
}));
jest.mock('@/lib/api/session/sessionEffects', () => ({
  clearPersistedAuthState: jest.fn(),
  redirectToLogin: jest.fn(),
}));
jest.mock('@/lib/logger/sessionLogging', () => ({
  sessionStoreLogging: new Proxy({}, { get: () => jest.fn() }),
  sessionInitializerLogging: new Proxy({}, { get: () => jest.fn() }),
  sessionRefreshLockLogging: new Proxy({}, { get: () => jest.fn() }),
}));
jest.mock('@/infrastructure/http', () => ({
  apiSdk: {
    auth: { refresh: jest.fn(), login: jest.fn(), getSessionUser: jest.fn() },
  },
  configureWebSessionBridge: jest.fn(),
  getApiErrorStatus: (error: { status?: number }) => error.status,
  getApiErrorMessage: () => 'test error',
}));
const { apiSdk } = jest.requireMock<typeof import('@/infrastructure/http')>(
  '@/infrastructure/http'
);
const { useSessionStore } = jest.requireActual<
  typeof import('@/lib/api/session/sessionStore')
>('@/lib/api/session/sessionStore');
const Providers =
  jest.requireActual<typeof import('./providers')>('./providers').default;

const user: SessionUser = {
  id: 7,
  username: 'doctor',
  email: 'doctor@example.com',
  full_name: 'Doctor',
  role: 'doctor',
  permissions: [],
  is_active: true,
};
const refresh = jest.mocked(apiSdk.auth.refresh);
const initialState = useSessionStore.getState();
function token(expiresIn: number) {
  return `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresIn }))}.signature`;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  localStorage.clear();
  useSessionStore.setState({
    ...initialState,
    sessionEpoch: useSessionStore.getState().sessionEpoch + 1,
    isAuthenticated: true,
    user,
    session: createUserSession({
      accessToken: token(60),
      refreshToken: 'refresh-a',
      accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60,
    }),
  });
  jest
    .mocked(apiSdk.auth.getSessionUser)
    .mockResolvedValue(
      user as Awaited<ReturnType<typeof apiSdk.auth.getSessionUser>>
    );
  jest.mocked(apiSdk.auth.login).mockImplementation(
    async () =>
      ({
        access_token: token(7200),
        refresh_token: 'refresh-b',
        token_type: 'bearer',
        expires_in: 7200,
        user,
      }) as Awaited<ReturnType<typeof apiSdk.auth.login>>
  );
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});
async function mount() {
  await act(async () => {
    render(
      <Providers>
        <div>private page</div>
      </Providers>
    );
  });
}

it.each(['timer', 'focus', 'visibilitychange'])(
  'prevents a stale %s refresh from logging out a newly signed-in session',
  async trigger => {
    const result = deferred<Awaited<ReturnType<typeof apiSdk.auth.refresh>>>();
    refresh.mockReturnValue(result.promise);
    const logout = jest.spyOn(useSessionStore.getState(), 'forceLogout');
    await mount();
    await act(async () => {
      if (trigger === 'timer') jest.advanceTimersByTime(30_000);
      else
        (trigger === 'focus' ? window : document).dispatchEvent(
          new Event(trigger)
        );
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => {
      await useSessionStore
        .getState()
        .login({ username: 'doctor', password: 'test-password' });
    });
    await act(async () => {
      result.resolve({
        tokens: {
          access_token: 'stale-access',
          refresh_token: 'stale-refresh',
          expires_in: 7200,
          token_type: 'bearer',
        },
      });
    });
    expect(logout).not.toHaveBeenCalled();
    expect(useSessionStore.getState()).toMatchObject({
      isAuthenticated: true,
      session: { refreshToken: 'refresh-b' },
    });
    logout.mockRestore();
  }
);

it('keeps a session during a refresh outage and retries on window focus', async () => {
  refresh.mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce({
    tokens: {
      access_token: token(7200),
      refresh_token: 'renewed',
      expires_in: 7200,
      token_type: 'bearer',
    },
  });
  const logout = jest.spyOn(useSessionStore.getState(), 'forceLogout');
  await mount();
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  expect(useSessionStore.getState().isAuthenticated).toBe(true);
  expect(logout).not.toHaveBeenCalled();
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(useSessionStore.getState().session?.refreshToken).toBe('renewed');
  logout.mockRestore();
});

it.each(['success', 'unauthorized'])(
  'ignores an old profile check returning %s after a new login',
  async outcome => {
    const profile =
      deferred<Awaited<ReturnType<typeof apiSdk.auth.getSessionUser>>>();
    jest
      .mocked(apiSdk.auth.getSessionUser)
      .mockReturnValueOnce(profile.promise);
    const logout = jest.spyOn(useSessionStore.getState(), 'forceLogout');
    await mount();
    await act(async () => {
      await useSessionStore
        .getState()
        .login({ username: 'doctor', password: 'test-password' });
    });
    await act(async () => {
      if (outcome === 'unauthorized') profile.reject({ status: 401 });
      else
        profile.resolve({ ...user, id: 99 } as Awaited<
          ReturnType<typeof apiSdk.auth.getSessionUser>
        >);
    });
    expect(logout).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user?.id).toBe(7);
    expect(useSessionStore.getState().session?.refreshToken).toBe('refresh-b');
    logout.mockRestore();
  }
);

it('expires the current session when its scheduled refresh is explicitly rejected', async () => {
  refresh.mockRejectedValueOnce({ status: 401 });
  const logout = jest.spyOn(useSessionStore.getState(), 'forceLogout');
  await mount();
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  expect(logout).toHaveBeenCalledTimes(1);
  expect(useSessionStore.getState().session).toBeNull();
  logout.mockRestore();
});
