import { beforeEach, expect, it, jest } from '@jest/globals';

const createBatch =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const createSessions =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const uploadPart =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const completeItem =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const markFailed =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/services/imageServices', () => ({
  createImageImportBatch: (...args: unknown[]) => createBatch(...args),
  createImageImportSessions: (...args: unknown[]) => createSessions(...args),
  uploadObjectPart: (...args: unknown[]) => uploadPart(...args),
  completeImageImportItem: (...args: unknown[]) => completeItem(...args),
  markImageImportUploadFailed: (...args: unknown[]) => markFailed(...args),
}));

jest.mock('../domain/imageTransform', () => ({
  maybeFlipImageFile: (file: File) => Promise.resolve(file),
}));

const { runBatchImportPipeline } = jest.requireActual<
  typeof import('./runBatchImportPipeline')
>('./runBatchImportPipeline');

beforeEach(() => {
  jest.clearAllMocks();
});

it('completes each uploaded file immediately through the item endpoint', async () => {
  const file = new File(['image'], 'ap.png', { type: 'image/png' });
  createBatch.mockResolvedValue({
    batch_id: 'batch-1',
    items: [
      {
        id: 11,
        client_file_id: 'file-1',
      },
    ],
  });
  createSessions.mockResolvedValue({
    items: [
      {
        item_id: 11,
        client_file_id: 'file-1',
        image_file_id: 31,
        upload_id: 'upload-1',
        part_size: 1024,
        parts: [{ part_number: 1, url: 'http://object/part-1' }],
      },
    ],
  });
  uploadPart.mockResolvedValue('etag-1');
  completeItem.mockResolvedValue({
    id: 11,
    client_file_id: 'file-1',
    filename: 'ap.png',
    size: file.size,
    mime_type: file.type,
    image_file_id: 31,
    upload_status: 'UPLOADED',
    ai_status: 'QUEUED',
    created_at: '2026-07-17T00:00:00',
    updated_at: '2026-07-17T00:00:00',
  });
  const patches: unknown[] = [];

  const batchId = await runBatchImportPipeline({
    files: [
      {
        id: 'file-1',
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        uploadStatus: 'pending',
        aiStatus: 'pending',
      },
    ],
    patientId: 7,
    description: '正位X光片',
    teamIds: [],
    flip: false,
    sessionWindowSize: 10,
    onFilePatch: (...args) => patches.push(args),
    onMessage: jest.fn(),
  });

  expect(batchId).toBe('batch-1');
  expect(uploadPart).toHaveBeenCalledWith(
    'http://object/part-1',
    expect.any(Blob)
  );
  expect(completeItem).toHaveBeenCalledWith('batch-1', 11, {
    upload_id: 'upload-1',
    parts: [{ part_number: 1, etag: 'etag-1' }],
  });
  expect(patches).toContainEqual([
    'file-1',
    expect.objectContaining({ uploadStatus: 'uploaded', aiStatus: 'queued' }),
  ]);
});
