import type { HttpClient, HttpRequest } from '@xiehe/api-client';
import { describe, expect, it, vi } from 'vitest';
import { createXieheApiSdk } from '../src';

function createClient() {
  const requestSpy = vi.fn(async (input: HttpRequest) => {
    if (input.url === '/api/v1/auth/login') {
      return { access_token: 'a', refresh_token: 'r', user: {} };
    }
    if (input.url === '/api/v1/patients/') {
      return { items: [], total: 0, page: 1, page_size: 20 };
    }
    return {};
  });
  const request = requestSpy as unknown as HttpClient['request'];
  const client: HttpClient = {
    request,
    requestWithMetadata: vi.fn(),
    get: (url, options) => request({ method: 'GET', url, ...options }),
    post: (url, data, options) =>
      request({ method: 'POST', url, data, ...options }),
    put: (url, data, options) =>
      request({ method: 'PUT', url, data, ...options }),
    patch: (url, data, options) =>
      request({ method: 'PATCH', url, data, ...options }),
    delete: (url, options) => request({ method: 'DELETE', url, ...options }),
  };
  return { client, request: requestSpy };
}

describe('Xiehe API SDK', () => {
  it('uses the public client for login', async () => {
    const authenticated = createClient();
    const publicClient = createClient();
    const sdk = createXieheApiSdk({
      apiClient: authenticated.client,
      publicApiClient: publicClient.client,
    });

    await sdk.auth.login({ username: 'doctor', password: 'secret' });

    expect(authenticated.request).not.toHaveBeenCalled();
    expect(publicClient.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/v1/auth/login',
      data: { username: 'doctor', password: 'secret' },
    });
  });

  it('normalizes paginated patient responses', async () => {
    const { client, request } = createClient();
    const sdk = createXieheApiSdk({ apiClient: client });

    const result = await sdk.patients.list({ search: '张三' });

    expect(result.items).toEqual([]);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/v1/patients/',
      params: { page: 1, page_size: 20, search: '张三' },
    });
  });

  it('uses durable session IDs for single and batch upload completion', async () => {
    const { client, request } = createClient();
    const sdk = createXieheApiSdk({ apiClient: client });
    const parts = [{ part_number: 1, etag: 'etag-1' }];

    await sdk.upload.completeSession('session-1', { parts });
    await sdk.upload.completeImportItem('batch-1', 7, {
      session_id: 'session-2',
      parts,
    });

    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      url: '/api/v1/upload/sessions/session-1/complete',
      data: { parts },
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'POST',
      url: '/api/v1/upload/batches/batch-1/items/7/complete',
      data: { session_id: 'session-2', parts },
    });
  });
});
