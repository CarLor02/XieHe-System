import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useEffect } from 'react';

import { apiClient } from '@/infrastructure/http';
import type { ImageFile } from '@/services/imageServices/imageFileService';
import { clearImageFileAccessUrlCache } from '@/services/imageServices/imageFileAccessUrlService';
import {
  parsePreviewDownloadConcurrency,
  useImagePreviewQueue,
} from './useImagePreviewQueue';

const mockedApiPost = jest.spyOn(apiClient, 'post');

function makeImageFile(id: number): ImageFile {
  return {
    id,
    file_uuid: `file-${id}`,
    original_filename: `xray-${id}.png`,
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 1024,
    storage_bucket: 'medical-image-files',
    object_key: `objects/xray-${id}.png`,
    storage_etag: `etag-${id}`,
    uploaded_by: 1,
    status: 'UPLOADED',
    upload_progress: 100,
    has_annotation: false,
    created_at: '2026-05-10T00:00:00',
  };
}

function PreviewQueueHarness({
  files,
  onValue,
}: {
  files: ImageFile[];
  onValue: (value: ReturnType<typeof useImagePreviewQueue>) => void;
}) {
  const value = useImagePreviewQueue(files);

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

describe('useImagePreviewQueue', () => {
  beforeEach(() => {
    clearImageFileAccessUrlCache();
    mockedApiPost.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
  });

  it('uses presigned URLs directly instead of Blob object URLs', async () => {
    mockedApiPost.mockResolvedValue({
      items: {
        1: {
          url: '/medical-image-files/objects/xray-1.png?sig=1',
          expires_in: 900,
          expires_at: '2026-05-10T00:15:00Z',
          etag: 'etag-1',
        },
      },
      errors: {},
    });
    const observedValues: ReturnType<typeof useImagePreviewQueue>[] = [];
    const onValue = (value: ReturnType<typeof useImagePreviewQueue>) => {
      observedValues.push(value);
    };

    render(
      <PreviewQueueHarness files={[makeImageFile(1)]} onValue={onValue} />
    );

    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledTimes(1);
    });
    expect(mockedApiPost.mock.calls[0]?.[1]).toEqual({
      ids: [1],
      variant: 'thumbnail',
    });
    await waitFor(() => {
      const latestValue = observedValues.at(-1);
      expect(latestValue?.imageUrls[1]).toBe(
        '/medical-image-files/objects/xray-1.png?sig=1'
      );
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('starts previews in order and fills a slot without waiting for the batch', async () => {
    mockedApiPost.mockResolvedValue({
      items: Object.fromEntries(
        Array.from({ length: 6 }, (_, index) => {
          const id = index + 1;
          return [
            id,
            {
              url: `/medical-image-files/objects/xray-${id}.png?sig=1`,
              expires_in: 900,
              etag: `etag-${id}`,
            },
          ];
        })
      ),
      errors: {},
    });
    const observedValues: ReturnType<typeof useImagePreviewQueue>[] = [];

    render(
      <PreviewQueueHarness
        files={Array.from({ length: 6 }, (_, index) =>
          makeImageFile(index + 1)
        )}
        onValue={value => observedValues.push(value)}
      />
    );

    await waitFor(() => {
      expect(Object.keys(observedValues.at(-1)?.imageUrls ?? {})).toEqual([
        '1',
        '2',
        '3',
        '4',
      ]);
    });

    act(() => observedValues.at(-1)?.handlePreviewLoad(2));

    await waitFor(() => {
      expect(Object.keys(observedValues.at(-1)?.imageUrls ?? {})).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
      ]);
    });

    act(() => observedValues.at(-1)?.handlePreviewLoad(1));

    await waitFor(() => {
      expect(Object.keys(observedValues.at(-1)?.imageUrls ?? {})).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
      ]);
    });
  });

  it('retries a pending thumbnail without requesting the original image', async () => {
    mockedApiPost
      .mockResolvedValueOnce({
        items: {},
        errors: {
          1: {
            code: 'thumbnail_not_ready',
            message: 'pending',
          },
        },
      })
      .mockResolvedValueOnce({
        items: {
          1: {
            url: '/medical-image-files/thumb.webp?sig=2',
            expires_in: 900,
            etag: 'thumb-etag-1',
          },
        },
        errors: {},
      });
    const observedValues: ReturnType<typeof useImagePreviewQueue>[] = [];

    render(
      <PreviewQueueHarness
        files={[makeImageFile(1)]}
        onValue={value => observedValues.push(value)}
      />
    );

    await waitFor(
      () => {
        expect(mockedApiPost).toHaveBeenCalledTimes(2);
      },
      { timeout: 2_500 }
    );
    expect(mockedApiPost.mock.calls.map(call => call[1])).toEqual([
      { ids: [1], variant: 'thumbnail' },
      { ids: [1], variant: 'thumbnail' },
    ]);
    await waitFor(() => {
      expect(observedValues.at(-1)?.imageUrls[1]).toBe(
        '/medical-image-files/thumb.webp?sig=2'
      );
    });
  });
});

describe('parsePreviewDownloadConcurrency', () => {
  it('accepts positive integers', () => {
    expect(parsePreviewDownloadConcurrency('6')).toBe(6);
  });

  it.each([undefined, '', '0', '-1', '2.5', 'invalid'])(
    'falls back to four for %s',
    value => {
      expect(parsePreviewDownloadConcurrency(value)).toBe(4);
    }
  );
});
