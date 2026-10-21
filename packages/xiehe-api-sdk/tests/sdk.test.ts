import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStellarmeshHttp } from '@xiehe/api-client/stellarmesh';
import type { HttpApi } from '@stellarmesh/sdk';
import { createXieheApiSdk, type XieheApiSdk } from '../src';
import { createAuthApi } from '../src/api/authApi';
import { createDashboardApi } from '../src/api/dashboardApi';
import { createErrorApi } from '../src/api/errorApi';
import { createImagingApi } from '../src/api/imagingApi';
import { createModelApi } from '../src/api/modelApi';
import { createPatientApi } from '../src/api/patientApi';
import { createReportApi } from '../src/api/reportApi';
import { createSystemApi } from '../src/api/systemApi';
import { createTeamApi } from '../src/api/teamApi';

let server: Server;
let sdk: XieheApiSdk;
let baseURL: string;
let aiStatus: number;
let rejectOldAiToken: boolean;
const prediction = {
  imageId: 'IMG7',
  imageWidth: 100,
  imageHeight: 200,
  measurements: [
    {
      type: 'sva',
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      value: '12 mm',
    },
  ],
};
let requests: {
  method?: string;
  path?: string;
  authorization?: string;
  body: unknown;
}[];
beforeEach(async () => {
  requests = [];
  aiStatus = 200;
  rejectOldAiToken = false;
  server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString();
    requests.push({
      method: request.method,
      path: request.url,
      authorization: request.headers.authorization,
      body: raw ? JSON.parse(raw) : undefined,
    });
    if (request.url === '/api/v1/image-files/7/ai/predict') {
      const status =
        rejectOldAiToken && request.headers.authorization !== 'Bearer new-token'
          ? 401
          : aiStatus;
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify(
          status === 200
            ? prediction
            : { code: status, message: 'AI unavailable', data: null }
        )
      );
      return;
    }
    let data: unknown = {};
    if (request.url === '/api/v1/auth/login')
      data = { access_token: 'a', refresh_token: 'r', user: {} };
    if (
      request.url === '/api/v1/patients/list' ||
      request.url === '/api/v1/image-files/list'
    )
      data = {
        items: [{ id: 7 }],
        pagination: { total: 6, page: 2, page_size: 5, total_pages: 2 },
      };
    if (request.url === '/api/v1/patients/delete') data = null;
    if (request.url === '/api/v1/dashboard/recent-activities')
      data = {
        activities: [{ id: 42, timestamp: '2026-10-19T08:30:00Z' }],
        total: 1,
      };
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ code: 200, message: 'ok', data }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No test server');
  baseURL = `http://127.0.0.1:${address.port}`;
  const http = createStellarmeshHttp({
    baseURL,
    tokenProvider: { getAccessToken: () => 'api-token' },
    getSessionEpoch: () => 1,
  });
  sdk = createXieheApiSdk({ http });
});
afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('shared API declarations over the published SDK', () => {
  it('uses a public login declaration with the backend default made explicit', async () => {
    await sdk.auth.login({ username: 'doctor', password: 'test-password' });
    expect(requests[0]).toEqual({
      method: 'POST',
      path: '/api/v1/auth/login',
      authorization: undefined,
      body: {
        username: 'doctor',
        password: 'test-password',
        remember_me: false,
      },
    });
  });
  it('puts filters in JSON and maps canonical pagination for UI state', async () => {
    expect(
      await sdk.patients.list({
        page: 2,
        page_size: 5,
        search: '测试',
        has_images: false,
      })
    ).toEqual({
      items: [{ id: 7 }],
      total: 6,
      page: 2,
      pageSize: 5,
      totalPages: 2,
    });
    expect(requests[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/patients/list',
      authorization: 'Bearer api-token',
      body: {
        page: 2,
        page_size: 5,
        search: '测试',
        has_images: false,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    });
  });
  it('keeps omitted update fields distinct from explicit null and returns null on delete', async () => {
    await sdk.patients.update(7, { phone: null });
    expect(requests[0].body).toEqual({ patient_id: 7, phone: null });
    expect(await sdk.patients.delete(7)).toBeNull();
    expect(requests[1]).toMatchObject({
      method: 'POST',
      path: '/api/v1/patients/delete',
      body: { patient_id: 7 },
    });
  });
  it('uses array filters and fixed metadata operation paths', async () => {
    await sdk.imaging.list({ team_ids: [3, 8], file_status: 'PROCESSED' });
    await sdk.imaging.rename(7, 'renamed');
    expect(requests[0]).toMatchObject({
      path: '/api/v1/image-files/list',
      body: {
        page: 1,
        page_size: 20,
        team_ids: [3, 8],
        file_status: 'PROCESSED',
      },
    });
    expect(requests[1]).toMatchObject({
      method: 'POST',
      path: '/api/v1/image-files/rename',
      body: { file_id: 7, basename: 'renamed' },
    });
  });
  it('preserves activity timestamps and numeric IDs', async () => {
    expect(await sdk.dashboard.getRecentActivities()).toEqual([
      { id: 42, timestamp: '2026-10-19T08:30:00Z' },
    ]);
  });
  it('keeps upload session methods, paths and bodies unchanged', async () => {
    const parts = [{ part_number: 1, etag: 'etag-1' }];
    await sdk.upload.completeSession('session-1', { parts });
    await sdk.upload.completeImportItem('batch-1', 7, {
      session_id: 'session-2',
      parts,
    });
    await sdk.upload.getStatus('session-1');
    expect(
      requests.map(({ method, path, body }) => ({ method, path, body }))
    ).toEqual([
      {
        method: 'POST',
        path: '/api/v1/upload/sessions/session-1/complete',
        body: { parts },
      },
      {
        method: 'POST',
        path: '/api/v1/upload/batches/batch-1/items/7/complete',
        body: { session_id: 'session-2', parts },
      },
      {
        method: 'GET',
        path: '/api/v1/upload/sessions/session-1',
        body: undefined,
      },
    ]);
  });
  it('preserves the raw AI measurement response and the authenticated storage proxy request', async () => {
    await expect(sdk.imaging.predict(7)).resolves.toEqual(prediction);
    expect(requests).toEqual([
      {
        method: 'POST',
        path: '/api/v1/image-files/7/ai/predict',
        authorization: 'Bearer api-token',
        body: undefined,
      },
    ]);
  });
  it('refreshes an expired session before replaying the raw AI measurement response', async () => {
    rejectOldAiToken = true;
    let token = 'expired-token';
    const refreshSession = vi.fn(async () => {
      token = 'new-token';
      return { accessToken: token };
    });
    const onUnauthorized = vi.fn();
    const authenticatedSdk = createXieheApiSdk({
      http: createStellarmeshHttp({
        baseURL,
        tokenProvider: { getAccessToken: () => token },
        getSessionEpoch: () => 1,
        refreshSession,
        onUnauthorized,
      }),
    });
    await expect(authenticatedSdk.imaging.predict(7)).resolves.toEqual(
      prediction
    );
    expect(requests.map(request => request.authorization)).toEqual([
      'Bearer expired-token',
      'Bearer new-token',
    ]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
  it('still rejects HTTP failures from the raw AI measurement endpoint', async () => {
    aiStatus = 503;
    await expect(sdk.imaging.predict(7)).rejects.toMatchObject({
      kind: 'http',
      status: 503,
    });
  });
  it('declares only POST operations present in the exported backend contract', () => {
    const contract = JSON.parse(
      readFileSync(
        new URL('../../../apiContract/openapi.json', import.meta.url),
        'utf8'
      )
    ) as { paths: Record<string, { post?: unknown }> };
    const declared: string[] = [];
    const http = {
      post: (url: string) => {
        declared.push(url);
        return () => Promise.resolve();
      },
    } as unknown as HttpApi;
    for (const create of [
      createAuthApi,
      createDashboardApi,
      createErrorApi,
      createImagingApi,
      createModelApi,
      createPatientApi,
      createReportApi,
      createSystemApi,
      createTeamApi,
    ])
      create(http);
    expect(declared.length).toBeGreaterThan(60);
    for (const path of declared)
      expect(contract.paths[path]?.post, path).toBeDefined();
  });
});
