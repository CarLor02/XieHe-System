import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  clearImageFileAccessUrlCache,
  clearCachedImageFileAccessUrl,
  getImageFileAccessUrl,
} from '../imageFileAccessUrlService';
import type { ImageFile, ImageFileDownloadUrl } from '../imageFileService';

function makeImageFile(id: number, etag = 'etag-a'): ImageFile {
  return {
    id,
    file_uuid: `file-${id}`,
    original_filename: `image-${id}.png`,
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 1024,
    storage_bucket: 'medical-image-files',
    object_key: `objects/image-${id}.png`,
    storage_etag: etag,
    uploaded_by: 1,
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-05-10T00:00:00',
  };
}

function makeDownloadUrl(url: string, expiresAt: string): ImageFileDownloadUrl {
  return {
    url,
    expires_in: 900,
    expires_at: expiresAt,
    etag: 'etag-a',
  };
}

describe('imageFileAccessUrlService', () => {
  beforeEach(() => {
    clearImageFileAccessUrlCache();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-10T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses an unexpired URL for the same file etag', async () => {
    const loader = jest.fn(async () =>
      makeDownloadUrl('/medical-image-files/a?sig=1', '2026-05-10T00:15:00Z')
    );

    const file = makeImageFile(1);

    await expect(getImageFileAccessUrl(file, { loader })).resolves.toBe('/medical-image-files/a?sig=1');
    await expect(getImageFileAccessUrl(file, { loader })).resolves.toBe('/medical-image-files/a?sig=1');

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the URL is within the expiry skew', async () => {
    const loader = jest
      .fn(async () => makeDownloadUrl('/medical-image-files/a?sig=1', '2026-05-10T00:00:30Z'))
      .mockResolvedValueOnce(makeDownloadUrl('/medical-image-files/a?sig=1', '2026-05-10T00:00:30Z'))
      .mockResolvedValueOnce(makeDownloadUrl('/medical-image-files/a?sig=2', '2026-05-10T00:15:00Z'));

    const file = makeImageFile(1);

    await expect(getImageFileAccessUrl(file, { loader })).resolves.toBe('/medical-image-files/a?sig=1');
    await expect(getImageFileAccessUrl(file, { loader })).resolves.toBe('/medical-image-files/a?sig=2');

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('separates cached URLs by etag and supports explicit clearing', async () => {
    const loader = jest
      .fn(async () => makeDownloadUrl('/medical-image-files/a?sig=1', '2026-05-10T00:15:00Z'))
      .mockResolvedValueOnce(makeDownloadUrl('/medical-image-files/a?sig=1', '2026-05-10T00:15:00Z'))
      .mockResolvedValueOnce(makeDownloadUrl('/medical-image-files/a?sig=2', '2026-05-10T00:15:00Z'))
      .mockResolvedValueOnce(makeDownloadUrl('/medical-image-files/a?sig=3', '2026-05-10T00:15:00Z'));

    await expect(getImageFileAccessUrl(makeImageFile(1, 'etag-a'), { loader })).resolves.toBe('/medical-image-files/a?sig=1');
    await expect(getImageFileAccessUrl(makeImageFile(1, 'etag-b'), { loader })).resolves.toBe('/medical-image-files/a?sig=2');

    clearCachedImageFileAccessUrl(1);

    await expect(getImageFileAccessUrl(makeImageFile(1, 'etag-b'), { loader })).resolves.toBe('/medical-image-files/a?sig=3');
    expect(loader).toHaveBeenCalledTimes(3);
  });
});
