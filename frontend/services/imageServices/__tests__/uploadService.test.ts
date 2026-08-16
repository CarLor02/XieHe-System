import { beforeEach, expect, it, jest } from '@jest/globals';

const createSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const completeSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const putObjectPart = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/infrastructure/http', () => ({
  apiSdk: {
    upload: {
      createSession: (...args: unknown[]) => createSession(...args),
      completeSession: (...args: unknown[]) => completeSession(...args),
    },
  },
  objectStorageClient: {
    requestWithMetadata: (...args: unknown[]) => putObjectPart(...args),
  },
}));

const { uploadSingleFile } =
  jest.requireActual<typeof import('../uploadService')>('../uploadService');

beforeEach(() => {
  jest.clearAllMocks();
});

it('reports byte progress and completes multipart parts in number order', async () => {
  createSession.mockResolvedValue({
    session_id: 'session-1',
    file_uuid: 'file-uuid',
    part_size: 3,
    parts: [
      { part_number: 2, url: 'https://storage/part-2' },
      { part_number: 1, url: 'https://storage/part-1' },
    ],
  });
  putObjectPart.mockImplementation(async (...args: unknown[]) => {
    const request = args[0] as {
      url: string;
      data: Blob;
      onUploadProgress?: (progress: { loaded: number; total?: number }) => void;
    };
    request.onUploadProgress?.({
      loaded: request.data.size,
      total: request.data.size,
    });
    return {
      data: '',
      status: 200,
      headers: { etag: `"etag-${request.url.at(-1)}"` },
    };
  });
  completeSession.mockResolvedValue({
    image_file_id: 17,
    status: 'UPLOADED',
  });
  const progress: Array<{ phase: string; percentage: number }> = [];

  await uploadSingleFile({
    file: new File(['12345'], 'image.png', { type: 'image/png' }),
    patient_id: '7',
    onProgress: snapshot => progress.push(snapshot),
  });

  expect(completeSession).toHaveBeenCalledWith('session-1', {
    parts: [
      { part_number: 1, etag: 'etag-1' },
      { part_number: 2, etag: 'etag-2' },
    ],
  });
  expect(progress).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ phase: 'uploading', percentage: 0 }),
      expect.objectContaining({ phase: 'confirming', percentage: 99 }),
      expect.objectContaining({ phase: 'completed', percentage: 100 }),
    ])
  );
  expect(progress.at(-1)).toMatchObject({
    phase: 'completed',
    percentage: 100,
  });
});
