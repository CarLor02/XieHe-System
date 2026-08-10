import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { createAxiosHttpClient } from '../src/infrastructure/axios';
import { ApiClientError } from '../src/contracts';

function response<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status = 200
): AxiosResponse<T> {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: status === 200 ? 'OK' : 'Error',
  };
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const failedResponse = response(config, { message: '未授权' }, 401);
  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    {},
    failedResponse
  );
}

describe('createAxiosHttpClient', () => {
  it('unwraps successful API envelopes and returns business data', async () => {
    const adapter: AxiosAdapter = async config =>
      response(config, {
        code: 200,
        message: 'ok',
        data: { id: 7 },
      });
    const client = createAxiosHttpClient({ axios: { adapter } });

    await expect(client.get<{ id: number }>('/items/7')).resolves.toEqual({
      id: 7,
    });
  });

  it('preserves raw and binary response payloads', async () => {
    const payload = new Uint8Array([1, 2, 3]).buffer;
    const adapter: AxiosAdapter = async config => response(config, payload);
    const client = createAxiosHttpClient({ axios: { adapter } });

    await expect(
      client.get<ArrayBuffer>('https://files.example/item', {
        auth: 'none',
        responseMode: 'raw',
        responseType: 'arraybuffer',
      })
    ).resolves.toBe(payload);
  });

  it('exposes response metadata only through the explicit transport method', async () => {
    const adapter: AxiosAdapter = async config => ({
      ...response(config, '', 200),
      headers: { ETag: 'part-1' },
    });
    const client = createAxiosHttpClient({ axios: { adapter } });

    await expect(
      client.requestWithMetadata<string>({
        method: 'PUT',
        url: 'https://files.example/upload',
        auth: 'none',
        responseMode: 'raw',
      })
    ).resolves.toEqual({
      data: '',
      status: 200,
      headers: { etag: 'part-1' },
    });
  });

  it('rejects business errors returned with HTTP 200', async () => {
    const adapter: AxiosAdapter = async config =>
      response(config, {
        code: 422,
        message: '字段无效',
        data: null,
      });
    const client = createAxiosHttpClient({ axios: { adapter } });

    await expect(client.get('/items')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: '字段无效',
      status: 200,
      apiCode: 422,
    } satisfies Partial<ApiClientError>);
  });

  it('does not leak authorization to foreign or explicitly unauthenticated URLs', async () => {
    const seen: Array<string | undefined> = [];
    const adapter: AxiosAdapter = async config => {
      seen.push(config.headers.get('Authorization')?.toString());
      return response(config, { code: 200, message: 'ok', data: true });
    };
    const client = createAxiosHttpClient({
      baseURL: 'https://api.example.test',
      tokenProvider: { getAccessToken: () => 'secret-token' },
      axios: { adapter },
    });

    await client.get('/internal');
    await client.get('https://object-storage.example/upload', {
      responseMode: 'raw',
    });
    await client.get('/public', { auth: 'none' });

    expect(seen).toEqual(['Bearer secret-token', undefined, undefined]);
  });

  it('collapses concurrent 401 responses into one refresh and retries once', async () => {
    let token = 'expired';
    let requestCount = 0;
    const adapter: AxiosAdapter = async config => {
      requestCount += 1;
      if (config.headers.get('Authorization') === 'Bearer expired') {
        throw unauthorized(config);
      }
      return response(config, {
        code: 200,
        message: 'ok',
        data: config.url,
      });
    };
    const refreshSession = vi.fn(async () => {
      await Promise.resolve();
      token = 'fresh';
      return { accessToken: token };
    });
    const client = createAxiosHttpClient({
      tokenProvider: { getAccessToken: () => token },
      refreshSession,
      axios: { adapter },
    });

    await expect(
      Promise.all([client.get('/one'), client.get('/two')])
    ).resolves.toEqual(['/one', '/two']);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(requestCount).toBe(4);
  });

  it('notifies the platform once when a shared refresh fails', async () => {
    const adapter: AxiosAdapter = async config => {
      throw unauthorized(config);
    };
    const onUnauthorized = vi.fn();
    const client = createAxiosHttpClient({
      tokenProvider: { getAccessToken: () => 'expired' },
      refreshSession: async () => null,
      onUnauthorized,
      axios: { adapter },
    });

    const results = await Promise.allSettled([
      client.get('/one'),
      client.get('/two'),
    ]);

    expect(results.every(result => result.status === 'rejected')).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
