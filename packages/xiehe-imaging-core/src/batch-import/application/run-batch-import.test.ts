import { describe, expect, it, vi } from 'vitest';

import { runBatchImportPipeline } from './run-batch-import';

describe('runBatchImportPipeline', () => {
  it('prepares, uploads, completes and emits stable events', async () => {
    const events: string[] = [];
    const patches: unknown[] = [];
    const completeItem = vi.fn(async () => ({
      image_file_id: 21,
      upload_status: 'UPLOADED' as const,
      ai_status: 'QUEUED' as const,
    }));
    const batchId = await runBatchImportPipeline({
      files: [{ id: 'one', source: new Uint8Array([1, 2, 3]) }],
      patientId: 1,
      description: '正位X光片',
      teamIds: [],
      flip: false,
      sessionWindowSize: 10,
      onEvent: event => events.push(event),
      onFilePatch: (id, patch) => patches.push([id, patch]),
      ports: {
        prepareFile: async source => ({
          source,
          filename: 'one.png',
          size: source.length,
          mimeType: 'image/png',
        }),
        createBatch: async () => ({
          batchId: 'batch-1',
          items: [
            {
              id: 11,
              client_file_id: 'one',
              upload_status: 'PENDING',
              ai_status: 'PENDING',
            },
          ],
        }),
        createSessions: async () => [
          {
            item_id: 11,
            client_file_id: 'one',
            session_id: 'session-1',
            part_size: 3,
            parts: [{ part_number: 1, url: 'signed' }],
          },
        ],
        uploadPart: vi.fn(async () => 'etag'),
        completeItem,
        markUploadFailed: vi.fn(async () => undefined),
        getErrorMessage: (_error, fallback) => fallback,
      },
    });

    expect(batchId).toBe('batch-1');
    expect(events).toEqual([
      'preparing-files',
      'creating-batch',
      'creating-upload-sessions',
      'upload-complete',
    ]);
    expect(patches.at(-1)).toEqual([
      'one',
      {
        imageFileId: 21,
        uploadStatus: 'uploaded',
        aiStatus: 'queued',
        error: null,
      },
    ]);
    expect(completeItem).toHaveBeenCalledWith({
      batchId: 'batch-1',
      itemId: 11,
      sessionId: 'session-1',
      parts: [{ part_number: 1, etag: 'etag' }],
    });
  });
});
