import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createStellarmeshHttp } from '@xiehe/api-client/stellarmesh';
import { createXieheApiSdk } from '@xiehe/api-sdk';
import {
  createAnnotationDocument,
  decodeAnnotationDocument,
} from '@xiehe/imaging-core/annotation-document';
import { createImageEditorGateway } from './createImageEditorGateway';
import { ImageEditorSession } from '../../features/image-editor/application/ImageEditorSession';

let server: Server | undefined;
afterEach(async () => {
  if (server)
    await new Promise<void>(resolve => server!.close(() => resolve()));
  server = undefined;
});

describe('image editor HTTP adapter', () => {
  it('loads, edits, version-saves, and reloads through the real generated SDK declarations', async () => {
    let version = 4;
    let annotation = createAnnotationDocument({
      measurements: [],
      imageWidth: 1200,
      imageHeight: 2400,
      standardDistance: 100,
      standardDistancePoints: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      reportText: '保留的报告',
    });
    const requests: {
      method: string;
      path: string;
      authorization: string | undefined;
      body: unknown;
    }[] = [];
    server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString() || 'null');
      const path = request.url ?? '';
      requests.push({
        method: request.method ?? '',
        path,
        authorization: request.headers.authorization,
        body,
      });
      const result =
        path === '/api/v1/image-files/get'
          ? {
              id: 42,
              file_uuid: 'fixture',
              file_type: 'PNG',
              description: '正位X光片',
              created_at: '2026-10-21T00:00:00Z',
              status: 'PROCESSED',
              annotation,
              annotation_version: version,
            }
          : path === '/api/v1/image-files/42/download-url'
            ? { url: 'test://original', expires_in: 60 }
            : path === '/api/v1/image-files/annotation/save'
              ? (() => {
                  if (body.expected_version !== version)
                    throw new Error('Version mismatch');
                  annotation = body.annotation;
                  version += 1;
                  return { file_id: 42, annotation_version: version };
                })()
              : null;
      response.writeHead(result ? 200 : 404, {
        'Content-Type': 'application/json',
      });
      response.end(
        JSON.stringify({
          code: result ? 200 : 404,
          message: result ? 'ok' : 'not found',
          data: result,
        })
      );
    });
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('No local HTTP port');
    const http = createStellarmeshHttp({
      baseURL: `http://127.0.0.1:${address.port}`,
      tokenProvider: { getAccessToken: async () => 'test-access' },
      getSessionEpoch: () => 0,
    });
    const sdk = createXieheApiSdk({ http });
    const session = new ImageEditorSession(
      42,
      createImageEditorGateway(sdk.imaging, sdk.reports)
    );
    await session.load();
    session.imageLoaded({ width: 1200, height: 2400 });
    session.chooseTool('aux-length');
    session.placePoint({ x: 300, y: 600 }, 1);
    session.placePoint({ x: 500, y: 600 }, 1);
    expect(await session.save()).toBe(true);
    const save = requests.find(
      item => item.path === '/api/v1/image-files/annotation/save'
    );
    expect(save).toMatchObject({
      method: 'POST',
      authorization: 'Bearer test-access',
      body: {
        file_id: 42,
        expected_version: 4,
        annotation: {
          schemaVersion: 1,
          imageWidth: 1200,
          imageHeight: 2400,
          reportText: '保留的报告',
          measurements: [
            {
              type: 'aux-length',
              points: [
                { x: 300, y: 600 },
                { x: 500, y: 600 },
              ],
              value: '100.00mm',
            },
          ],
        },
      },
    });
    expect(
      requests.find(item => item.path.endsWith('/download-url'))?.method
    ).toBe('GET');
    await session.load();
    session.imageLoaded({ width: 1200, height: 2400 });
    expect(session.getState().annotationVersion).toBe(5);
    expect(session.snapshot?.measurements).toEqual(
      decodeAnnotationDocument(annotation)?.measurements
    );
  });
});
