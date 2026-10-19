import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHttpClientAdapter,
  createStellarmeshHttp,
} from '../src/infrastructure/stellarmesh';
import { normalizeApiError } from '../src/infrastructure/stellarmesh';

let server: Server;
let baseURL: string;
let handler: (
  request: IncomingMessage,
  response: ServerResponse
) => void | Promise<void>;
const json = (response: ServerResponse, data: unknown, status = 200) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(
    JSON.stringify({
      code: status,
      message: status === 200 ? 'ok' : 'expired',
      data,
    })
  );
};
beforeEach(async () => {
  handler = (_request, response) => json(response, { ok: true });
  server = createServer((request, response) => void handler(request, response));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No test server');
  baseURL = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('Stellarmesh project adapter', () => {
  it('flattens both plain and metadata responses and preserves null', async () => {
    handler = (_request, response) => json(response, null);
    const http = createStellarmeshHttp({ baseURL });
    expect(await http.post<void, null>('/operation')()).toBeNull();
    const result = await http.withMetadata().post<void, null>('/operation')();
    expect(result.data).toBeNull();
    expect(result.status).toBe(200);
  });
  it('shares one refresh for concurrent authenticated declarations and byte-port requests', async () => {
    let token = 'old';
    const refreshSession = vi.fn(async () => {
      token = 'new';
      return { accessToken: token };
    });
    const onUnauthorized = vi.fn();
    handler = (request, response) =>
      json(
        response,
        { ok: true },
        request.headers.authorization === 'Bearer new' ? 200 : 401
      );
    const http = createStellarmeshHttp({
      baseURL,
      tokenProvider: { getAccessToken: () => token },
      getSessionEpoch: () => 1,
      refreshSession,
      onUnauthorized,
    });
    await Promise.all([
      http.post<void, unknown>('/a')(),
      http.post<void, unknown>('/b')(),
      createHttpClientAdapter(http).get('/c'),
    ]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
  it('does not expire a session on a temporary refresh failure', async () => {
    const onUnauthorized = vi.fn();
    handler = (_request, response) => json(response, null, 401);
    const http = createStellarmeshHttp({
      baseURL,
      tokenProvider: { getAccessToken: () => 'old' },
      getSessionEpoch: () => 1,
      refreshSession: async () => {
        throw new Error('temporary outage');
      },
      onUnauthorized,
    });
    await expect(
      http.post<void, unknown>('/operation')()
    ).rejects.toMatchObject({
      kind: 'auth',
      cause: { message: 'temporary outage' },
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
  it('drops a late response when the login session changes', async () => {
    let epoch = 1;
    let received!: () => void;
    let release!: () => void;
    const entered = new Promise<void>(resolve => {
      received = resolve;
    });
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    handler = async (_request, response) => {
      received();
      await gate;
      json(response, { private: true });
    };
    const http = createStellarmeshHttp({
      baseURL,
      tokenProvider: { getAccessToken: () => 'old' },
      getSessionEpoch: () => epoch,
    });
    const pending = http.post<void, unknown>('/operation')();
    const rejected = expect(pending).rejects.toMatchObject({
      kind: 'session-changed',
    });
    await entered;
    epoch += 1;
    release();
    await rejected;
  });
  it('sends exact bytes to object storage without auth and reads an empty 200 response with ETag', async () => {
    const bodies: Buffer[] = [];
    handler = async (request, response) => {
      expect(request.headers.authorization).toBeUndefined();
      for await (const chunk of request) bodies.push(Buffer.from(chunk));
      response.writeHead(200, { ETag: '"part-1"' });
      response.end('');
    };
    const storage = createHttpClientAdapter(
      createStellarmeshHttp({ raw: true })
    );
    const response = await storage.requestWithMetadata<string, ArrayBuffer>({
      method: 'PUT',
      url: baseURL + '/signed-part',
      data: new Uint8Array([1, 2, 3]).buffer,
      auth: 'none',
      responseMode: 'raw',
    });
    expect(response.headers.etag).toBe('"part-1"');
    expect(Buffer.concat(bodies)).toEqual(Buffer.from([1, 2, 3]));
  });
  it('never injects API authorization into a foreign origin', async () => {
    const getAccessToken = vi.fn(() => 'private-token');
    const external = createServer((request, response) => {
      expect(request.headers.authorization).toBeUndefined();
      json(response, true);
    });
    await new Promise<void>(resolve =>
      external.listen(0, '127.0.0.1', resolve)
    );
    try {
      const address = external.address();
      if (!address || typeof address === 'string')
        throw new Error('No external fixture');
      const http = createStellarmeshHttp({
        baseURL,
        tokenProvider: { getAccessToken },
        getSessionEpoch: () => 1,
      });
      expect(
        await http.get<void, boolean>(
          `http://127.0.0.1:${address.port}/signed`
        )()
      ).toBe(true);
      expect(getAccessToken).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>(resolve => external.close(() => resolve()));
    }
  });
  it('preserves HTTP status and project validation details for UI errors', async () => {
    handler = (_request, response) => {
      response.writeHead(422, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          code: 422,
          message: '参数无效',
          error_code: 'VAL_REQUEST',
          details: [{ field: 'body.page', message: '必须大于 0' }],
        })
      );
    };
    const error = await createStellarmeshHttp({ baseURL })
      .post<void, unknown>('/operation')()
      .catch(normalizeApiError);
    expect(error).toMatchObject({
      status: 422,
      message: '参数无效',
      errorCode: 'VAL_REQUEST',
      details: [{ field: 'body.page', message: '必须大于 0' }],
    });
  });
});
