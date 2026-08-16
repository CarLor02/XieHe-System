import { describe, expect, it, vi } from 'vitest';
import { runWithConcurrency } from '@xiehe/upload-core';

import { chunkItems, patchFromServerItem } from './index';

describe('batch import application rules', () => {
  it('maps backend processing state without platform types', () => {
    expect(
      patchFromServerItem({
        image_file_id: 7,
        upload_status: 'UPLOADED',
        ai_status: 'QUEUED',
      })
    ).toEqual({
      imageFileId: 7,
      uploadStatus: 'uploaded',
      aiStatus: 'queued',
      error: null,
    });
  });

  it('chunks work and honors the concurrency ceiling', async () => {
    expect(chunkItems([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    let active = 0;
    let peak = 0;
    const worker = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
    });
    await runWithConcurrency([1, 2, 3, 4], 2, worker);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
