import { patchFromServerItem } from './status';
import type { ImageImportItem } from '@/services/imageServices';
import { expect, it } from '@jest/globals';

function item(
  overrides: Partial<ImageImportItem> = {}
): ImageImportItem {
  return {
    id: 1,
    client_file_id: 'file-1',
    filename: 'ap.png',
    size: 100,
    mime_type: 'image/png',
    upload_status: 'UPLOADED',
    ai_status: 'QUEUED',
    created_at: '2026-07-17T00:00:00',
    updated_at: '2026-07-17T00:00:00',
    ...overrides,
  };
}

it('maps persisted import states to local display states', () => {
  expect(patchFromServerItem(item())).toMatchObject({
    uploadStatus: 'uploaded',
    aiStatus: 'queued',
    error: null,
  });
  expect(
    patchFromServerItem(
      item({
        upload_status: 'FAILED',
        ai_status: 'FAILED',
        error: '上传失败',
      })
    )
  ).toMatchObject({
    uploadStatus: 'error',
    aiStatus: 'failed',
    error: '上传失败',
  });
});
