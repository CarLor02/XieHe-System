import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import {
  createStellarmeshHttp,
  createHttpClientAdapter,
} from '@xiehe/api-client/stellarmesh';
import { createXieheApiSdk } from '@xiehe/api-sdk';
import type { ExpoApiInfrastructure } from '../../../infrastructure/http/createExpoApiInfrastructure';
import type { MobileSessionTokens } from '../../../infrastructure/auth/sessionTokens';
import { signIn, signOut } from '../../auth/usecases/session';
import { uploadImage } from './uploadImage';

interface RequestRecord {
  path: string;
  method: string;
  authorization?: string;
  body: Buffer;
}
let server: Server;
let baseUrl: string;
let api: ExpoApiInfrastructure;
let requests: RequestRecord[];
let includeEtag: boolean;
let failCompletion: boolean;
let denyLogout: boolean;

beforeEach(async () => {
  requests = [];
  includeEtag = true;
  failCompletion = false;
  denyLogout = false;
  server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    requests.push({
      path: request.url || '',
      method: request.method || '',
      authorization: request.headers.authorization,
      body,
    });
    const json = (data: unknown, status = 200) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          code: status,
          message: status === 200 ? 'ok' : 'failed',
          data,
        })
      );
    };
    if (request.url === '/api/v1/auth/login')
      return json({
        access_token: 'test-access',
        refresh_token: 'test-refresh',
        user: { id: 1, username: 'test-user', full_name: '测试用户' },
      });
    if (request.url === '/api/v1/auth/logout')
      return json(null, denyLogout ? 503 : 200);
    if (request.url === '/api/v1/upload/sessions')
      return json({
        session_id: 'session',
        part_size: 4,
        file_uuid: 'test-file',
        parts: [
          { part_number: 2, url: `${baseUrl}/storage/2` },
          { part_number: 1, url: `${baseUrl}/storage/1` },
        ],
      });
    if (request.url?.startsWith('/storage/')) {
      response.writeHead(
        200,
        includeEtag ? { ETag: `"part-${request.url.slice(-1)}"` } : {}
      );
      response.end('');
      return;
    }
    if (request.url === '/api/v1/upload/sessions/session/complete')
      return json({
        session_id: 'session',
        image_file_id: failCompletion ? null : 42,
        status: failCompletion ? 'failed' : 'completed',
        error: failCompletion ? '服务端拒绝文件' : null,
      });
    json(null, 404);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Test server failed to bind');
  baseUrl = `http://127.0.0.1:${address.port}`;
  let tokens: MobileSessionTokens | null = null;
  let epoch = 0;
  const tokenStore = {
    getSessionEpoch: () => epoch,
    getAccessToken: async () => tokens?.accessToken ?? null,
    getRefreshToken: async () => tokens?.refreshToken ?? null,
    async save(value: MobileSessionTokens) {
      tokens = value;
    },
    async clear() {
      tokens = null;
      epoch += 1;
    },
  };
  const http = createStellarmeshHttp({
    baseURL: baseUrl,
    tokenProvider: tokenStore,
    getSessionEpoch: tokenStore.getSessionEpoch,
  });
  api = {
    tokenStore,
    apiSdk: createXieheApiSdk({ http }),
  };
});
afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('mobile flows over the shared HTTP/SDK assembly', () => {
  it('logs in with the real wire contract, authorizes logout, and clears local tokens even after a server failure', async () => {
    expect(
      (
        await signIn(
          { auth: api.apiSdk.auth, tokens: api.tokenStore },
          ' test-user ',
          'test-password'
        )
      ).username
    ).toBe('test-user');
    expect(JSON.parse(requests[0].body.toString())).toEqual({
      username: 'test-user',
      password: 'test-password',
      remember_me: true,
    });
    expect(await api.tokenStore.getAccessToken()).toBe('test-access');
    denyLogout = true;
    await expect(
      signOut({ auth: api.apiSdk.auth, tokens: api.tokenStore })
    ).resolves.toBeUndefined();
    expect(
      requests.find(request => request.path.endsWith('/logout'))?.authorization
    ).toBe('Bearer test-access');
    expect(await api.tokenStore.getAccessToken()).toBeNull();
  });

  function input(onProgress: (value: number) => void) {
    const bytes = new TextEncoder().encode('abcdefgh');
    return {
      uploads: api.apiSdk.upload,
      storage: createHttpClientAdapter(createStellarmeshHttp({ raw: true })),
      file: {
        name: 'contract-test.png',
        uri: 'fixture://test',
        mimeType: 'image/png',
        size: bytes.length,
        readChunk: async (start: number, end: number) =>
          bytes.slice(start, end).buffer,
      },
      patientId: 7,
      examType: '正位X光片',
      teamIds: [9],
      onProgress,
    };
  }

  it('sends exact file parts without API authorization and reports success only after completion', async () => {
    await api.tokenStore.save({
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
    });
    const progress: number[] = [];
    expect(await uploadImage(input(value => progress.push(value)))).toBe(42);
    const sessionRequest = requests.find(
      request => request.path === '/api/v1/upload/sessions'
    );
    expect(sessionRequest?.authorization).toBe('Bearer test-access');
    expect(JSON.parse(sessionRequest!.body.toString())).toMatchObject({
      patient_id: 7,
      team_ids: [9],
      size: 8,
      description: '正位X光片',
    });
    const parts = requests
      .filter(request => request.path.startsWith('/storage/'))
      .sort((a, b) => a.path.localeCompare(b.path));
    expect(parts.map(part => part.body.toString())).toEqual(['abcd', 'efgh']);
    expect(parts.every(part => !part.authorization)).toBe(true);
    const completion = requests.find(request =>
      request.path.endsWith('/complete')
    );
    expect(JSON.parse(completion!.body.toString())).toEqual({
      parts: [
        { part_number: 1, etag: 'part-1' },
        { part_number: 2, etag: 'part-2' },
      ],
    });
    expect(progress.at(-1)).toBe(100);
    expect(progress.slice(0, -1).every(value => value < 100)).toBe(true);
  });
  it('never confirms an upload without storage ETags', async () => {
    includeEtag = false;
    const progress: number[] = [];
    await expect(
      uploadImage(input(value => progress.push(value)))
    ).rejects.toThrow('ETag');
    expect(requests.some(request => request.path.endsWith('/complete'))).toBe(
      false
    );
    expect(progress.every(value => value < 100)).toBe(true);
  });
  it('surfaces server-side completion failures instead of showing a successful upload', async () => {
    failCompletion = true;
    const progress: number[] = [];
    await expect(
      uploadImage(input(value => progress.push(value)))
    ).rejects.toThrow('服务端拒绝文件');
    expect(progress.every(value => value < 100)).toBe(true);
  });
});
