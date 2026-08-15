import { describe, expect, it, vi } from 'vitest';

import {
  createImageAccessUrlCache,
  getThumbnailPendingRetryDelay,
  planPreviewRenderFailure,
  resolveImageAccessUrls,
  shouldRetryPreviewBatchRequest,
} from './index';

const file = {
  id: 7,
  fileUuid: 'file-7',
  storageEtag: 'etag-1',
};

describe('image access URL cache', () => {
  it('uses a versioned entry until the expiry skew is reached', () => {
    let now = 1_000_000;
    const cache = createImageAccessUrlCache({ now: () => now });
    cache.set(file, { url: 'signed', expiresIn: 120 });
    expect(cache.get(file)?.url).toBe('signed');
    now += 61_000;
    expect(cache.get(file)).toBeNull();
  });

  it('loads only misses and merges partial batch results', async () => {
    const cache = createImageAccessUrlCache({ now: () => 1_000_000 });
    cache.set(file, { url: 'cached', expiresIn: 120 });
    const loadMany = vi.fn(async () => ({
      items: { 8: { url: 'loaded', expiresIn: 120 } },
      errors: { 9: 'missing' },
    }));
    const result = await resolveImageAccessUrls({
      files: [
        file,
        { id: 8, fileUuid: 'file-8' },
        { id: 9, fileUuid: 'file-9' },
      ],
      cache,
      loadMany,
    });
    expect(loadMany).toHaveBeenCalledWith([8, 9]);
    expect(result.items).toMatchObject({
      7: { url: 'cached' },
      8: { url: 'loaded' },
    });
    expect(result.errors).toEqual({ 9: 'missing' });
  });

  it('isolates original and thumbnail URLs while clearing both by file id', () => {
    const cache = createImageAccessUrlCache({ now: () => 1_000_000 });
    const original = { ...file, variant: 'original' as const };
    const thumbnail = { ...file, variant: 'thumbnail' as const };
    cache.set(original, { url: 'original-url', expiresIn: 120 });
    cache.set(thumbnail, { url: 'thumbnail-url', expiresIn: 120 });

    expect(cache.get(original)?.url).toBe('original-url');
    expect(cache.get(thumbnail)?.url).toBe('thumbnail-url');

    cache.clearFile(file.id);
    expect(cache.get(original)).toBeNull();
    expect(cache.get(thumbnail)).toBeNull();
  });
});

describe('preview retry policy', () => {
  it('refreshes the URL once before falling back', () => {
    expect(planPreviewRenderFailure(0).action).toBe('refresh-access-url');
    expect(planPreviewRenderFailure(1).action).toBe('fallback');
    expect(shouldRetryPreviewBatchRequest(2, 3)).toBe(true);
    expect(shouldRetryPreviewBatchRequest(3, 3)).toBe(false);
    expect(getThumbnailPendingRetryDelay(0)).toBe(1_000);
    expect(getThumbnailPendingRetryDelay(4)).toBe(16_000);
    expect(getThumbnailPendingRetryDelay(5)).toBeNull();
  });
});
