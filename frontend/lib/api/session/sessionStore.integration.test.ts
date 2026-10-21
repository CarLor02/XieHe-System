/** @jest-environment node */

import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { SessionUser } from '@xiehe/api-contracts';

jest.mock('@/lib/logger/sessionLogging', () => ({
  sessionStoreLogging: new Proxy({}, { get: () => jest.fn() }),
  sessionRefreshLockLogging: new Proxy({}, { get: () => jest.fn() }),
}));
jest.mock('./sessionEffects', () => ({
  ...jest.requireActual<typeof import('./sessionEffects')>('./sessionEffects'),
  redirectToLogin: jest.fn(),
}));

const user: SessionUser = {
  id: 7,
  username: 'doctor',
  email: 'doctor@example.com',
  full_name: 'Doctor',
  role: 'doctor',
  permissions: [],
  is_active: true,
};
const tokenPair = (access = 'new-access', refresh = 'new-refresh') => ({
  access_token: access,
  refresh_token: refresh,
  token_type: 'bearer',
  expires_in: 43200,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
function json(response: ServerResponse, data: unknown, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ code: status, message: 'test', data }));
}

let store: (typeof import('./sessionStore'))['useSessionStore'];
let proactiveRefresh: (typeof import('./sessionRefresher'))['refreshAccessTokenWithLock'];
let refreshHandler: (
  response: ServerResponse,
  body: unknown
) => void | Promise<void>;
let profileStatus: number;
let refreshRequests: Array<{ body: unknown; authorization?: string }>;
const server = createServer((request, response) => {
  void handleRequest(request, response);
});

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
) {
  if (request.url === '/api/v1/auth/refresh') {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString());
    refreshRequests.push({
      body,
      authorization: request.headers.authorization,
    });
    await refreshHandler(response, body);
  } else if (request.url === '/api/v1/auth/login') {
    json(response, {
      ...tokenPair('account-b-access', 'account-b-refresh'),
      user,
    });
  } else if (request.url === '/api/v1/auth/me') {
    const status =
      profileStatus === 200 &&
      request.headers.authorization === 'Bearer old-access'
        ? 401
        : profileStatus;
    json(response, status === 200 ? user : null, status);
  } else json(response, null, 404);
}

const storage = new Map<string, string>();
const previousStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage'
);
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const previousApiUrl = process.env.NEXT_PUBLIC_API_URL;
beforeAll(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No test address');
  process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${address.port}`;
  store = (await import('./sessionStore')).useSessionStore;
  proactiveRefresh = (await import('./sessionRefresher'))
    .refreshAccessTokenWithLock;
});
afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  if (previousApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = previousApiUrl;
  if (previousStorage)
    Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
  if (previousWindow)
    Object.defineProperty(globalThis, 'window', previousWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
beforeEach(() => {
  storage.clear();
  refreshRequests = [];
  profileStatus = 200;
  refreshHandler = response => json(response, { tokens: tokenPair() });
  store.setState({
    sessionEpoch: store.getState().sessionEpoch + 1,
    isAuthenticated: true,
    isLoggingOut: false,
    isLoading: false,
    error: null,
    user,
    session: {
      accessToken: 'old-access',
      refreshToken: 'valid-refresh',
      accessTokenExpiresAtEpochSeconds: 1,
    },
  });
});

it('restores a persisted session and refreshes an expired access token using data.tokens', async () => {
  storage.set(
    'auth-storage',
    JSON.stringify({
      state: {
        session: store.getState().session,
        user,
        isAuthenticated: false,
      },
      version: 0,
    })
  );
  await store.persist.rehydrate();
  expect(await store.getState().fetchUserInfoStatus()).toBe('success');
  expect(store.getState()).toMatchObject({
    isAuthenticated: true,
    session: { accessToken: 'new-access', refreshToken: 'new-refresh' },
  });
  expect(refreshRequests).toEqual([
    { body: { refresh_token: 'valid-refresh' }, authorization: undefined },
  ]);
  expect(
    JSON.parse(storage.get('auth-storage')!).state.session.accessToken
  ).toBe('new-access');
});

it('shares the actual SDK 401 refresh with proactive and direct store refreshes', async () => {
  const entered = deferred<void>();
  const release = deferred<void>();
  refreshHandler = async response => {
    entered.resolve();
    await release.promise;
    json(response, { tokens: tokenPair() });
  };
  const profile = store.getState().fetchUserInfoStatus();
  await entered.promise;
  const proactive = proactiveRefresh();
  const direct = store.getState().refreshAccessToken();
  release.resolve();
  expect(await Promise.all([profile, proactive, direct])).toEqual([
    'success',
    true,
    true,
  ]);
  expect(refreshRequests).toHaveLength(1);
});

it.each(['unavailable', 'disconnected', 'malformed'])(
  'keeps the session after a %s refresh and recovers on the next request',
  async failure => {
    refreshHandler = response => {
      if (failure === 'disconnected') response.destroy();
      else
        json(
          response,
          failure === 'malformed' ? {} : null,
          failure === 'unavailable' ? 503 : 200
        );
    };
    expect(await store.getState().fetchUserInfoStatus()).toBe('error');
    expect(store.getState()).toMatchObject({
      isAuthenticated: true,
      session: { accessToken: 'old-access' },
    });
    refreshHandler = response => json(response, { tokens: tokenPair() });
    expect(await store.getState().fetchUserInfoStatus()).toBe('success');
    expect(refreshRequests).toHaveLength(2);
  }
);

it('clears the session when the refresh endpoint explicitly rejects the refresh token', async () => {
  refreshHandler = response => json(response, null, 401);
  await Promise.all([
    store.getState().fetchUserInfoStatus(),
    store.getState().fetchUserInfoStatus(),
  ]);
  expect(store.getState()).toMatchObject({
    isAuthenticated: false,
    session: null,
    isLoggingOut: true,
  });
  expect(refreshRequests).toHaveLength(1);
  expect(storage.has('auth-storage')).toBe(false);
});

it('does not classify a profile permission error as an expired session', async () => {
  profileStatus = 403;
  expect(await store.getState().fetchUserInfoStatus()).toBe('error');
  expect(store.getState().isAuthenticated).toBe(true);
  expect(refreshRequests).toHaveLength(0);
});

it('isolates refreshes across a new login and prevents late responses from releasing its lock', async () => {
  const enteredA = deferred<void>();
  const enteredB = deferred<void>();
  const releaseA = deferred<void>();
  const releaseB = deferred<void>();
  refreshHandler = async (response, body) => {
    if ((body as { refresh_token: string }).refresh_token === 'valid-refresh') {
      enteredA.resolve();
      await releaseA.promise;
      json(response, { tokens: tokenPair('stale-access', 'stale-refresh') });
    } else {
      enteredB.resolve();
      await releaseB.promise;
      json(response, { tokens: tokenPair('b-refreshed', 'b-refresh') });
    }
  };
  const first = proactiveRefresh();
  await enteredA.promise;
  expect(
    await store
      .getState()
      .login({ username: 'doctor', password: 'test-password' })
  ).toBe(true);
  const second = proactiveRefresh();
  await enteredB.promise;
  releaseA.resolve();
  expect(await first).toBe(false);
  expect(store.getState().session?.accessToken).toBe('account-b-access');
  const third = proactiveRefresh();
  releaseB.resolve();
  expect(await Promise.all([second, third])).toEqual([true, true]);
  expect(refreshRequests).toHaveLength(2);
  expect(store.getState().session?.accessToken).toBe('b-refreshed');
});
