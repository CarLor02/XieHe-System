import { createServer, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBoundSessionTokenStore,
  type MobileSessionTokenStore,
} from '../auth/sessionTokens';
import {
  createExpoApiInfrastructure,
  type ExpoApiInfrastructure,
} from './createExpoApiInfrastructure';

// 本测试注入真实有序令牌存储的内存适配，避免载入 Expo 原生运行时。
vi.mock('../auth', () => ({ createSecureSessionTokenStore: vi.fn() }));
vi.mock('./config', () => ({ getExpoApiBaseUrl: vi.fn() }));

function json(response: ServerResponse, data: unknown, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ code: status, message: 'test', data }));
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('Expo session with the published SDK', () => {
  let server: Server;
  let tokens: MobileSessionTokenStore;
  let api: ExpoApiInfrastructure['apiSdk'];
  let persisted: string | null;
  let refresh: (response: ServerResponse) => void | Promise<void>;
  let refreshCalls: { body: unknown; authorization?: string }[];
  let unauthorized = vi.fn<() => void>();
  const renewed = {
    tokens: {
      access_token: 'renewed-access',
      refresh_token: 'renewed-refresh',
      expires_in: 43200,
      token_type: 'bearer',
    },
  };

  beforeEach(async () => {
    refreshCalls = [];
    persisted = null;
    unauthorized = vi.fn<() => void>();
    refresh = response => json(response, renewed);
    server = createServer(async (request, response) => {
      if (request.url === '/api/v1/auth/refresh') {
        const chunks = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        refreshCalls.push({
          body: JSON.parse(Buffer.concat(chunks).toString()),
          authorization: request.headers.authorization,
        });
        await refresh(response);
      } else if (request.url === '/api/v1/auth/me') {
        const authorized =
          request.headers.authorization === 'Bearer renewed-access';
        json(
          response,
          authorized ? { id: 7, username: 'doctor' } : null,
          authorized ? 200 : 401
        );
      } else json(response, null, 404);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('No test address');
    const apiBaseUrl = `http://127.0.0.1:${address.port}`;
    tokens = createBoundSessionTokenStore(apiBaseUrl, {
      read: async () => persisted,
      write: async value => {
        persisted = value;
      },
      remove: async () => {
        persisted = null;
      },
    });
    await tokens.save({
      accessToken: 'expired-access',
      refreshToken: 'valid-refresh',
    });
    api = createExpoApiInfrastructure({
      apiBaseUrl,
      tokenStore: tokens,
      onUnauthorized: unauthorized,
    }).apiSdk;
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('refreshes concurrent expired requests once, persists data.tokens and replays with the new access token', async () => {
    const users = await Promise.all([
      api.auth.getSessionUser(),
      api.auth.getSessionUser(),
      api.auth.getSessionUser(),
    ]);
    expect(users.map(user => user.id)).toEqual([7, 7, 7]);
    expect(refreshCalls).toEqual([
      { body: { refresh_token: 'valid-refresh' }, authorization: undefined },
    ]);
    expect(await tokens.getAccessToken()).toBe('renewed-access');
    expect(await tokens.getRefreshToken()).toBe('renewed-refresh');
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'disconnected', 'malformed'])(
    'preserves tokens after a %s refresh and allows a later retry',
    async failure => {
      refresh = response => {
        if (failure === 'disconnected') response.destroy();
        else
          json(
            response,
            failure === 'malformed' ? {} : null,
            failure === 'unavailable' ? 503 : 200
          );
      };
      await expect(api.auth.getSessionUser()).rejects.toBeDefined();
      expect(await tokens.getAccessToken()).toBe('expired-access');
      expect(unauthorized).not.toHaveBeenCalled();
      refresh = response => json(response, renewed);
      expect((await api.auth.getSessionUser()).id).toBe(7);
      expect(refreshCalls).toHaveLength(2);
    }
  );

  it('clears tokens and notifies the app when the refresh token is rejected', async () => {
    refresh = response => json(response, null, 401);
    await Promise.allSettled([
      api.auth.getSessionUser(),
      api.auth.getSessionUser(),
    ]);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(persisted).toBeNull();
    expect(await tokens.getAccessToken()).toBeNull();
  });

  it('cannot resurrect a signed-out session from an in-flight refresh', async () => {
    const entered = deferred();
    const release = deferred();
    refresh = async response => {
      entered.resolve();
      await release.promise;
      json(response, renewed);
    };
    const pending = api.auth.getSessionUser();
    const rejection = expect(pending).rejects.toMatchObject({
      kind: 'session-changed',
    });
    await entered.promise;
    await tokens.clear();
    release.resolve();
    await rejection;
    expect(persisted).toBeNull();
    expect(unauthorized).not.toHaveBeenCalled();
  });
});
