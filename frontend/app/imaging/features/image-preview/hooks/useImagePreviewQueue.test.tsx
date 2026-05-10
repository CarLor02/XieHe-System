import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useEffect } from 'react';

import { apiClient } from '@/lib/api';
import type { ImageFile } from '@/services/imageServices/imageFileService';
import { clearImageFileAccessUrlCache } from '@/services/imageServices/imageFileAccessUrlService';
import { useImagePreviewQueue } from './useImagePreviewQueue';

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
      data: {
        code: 200,
        message: 'ok',
        data: {
          items: {
            1: {
              url: '/medical-image-files/objects/xray-1.png?sig=1',
              expires_in: 900,
              expires_at: '2026-05-10T00:15:00Z',
              etag: 'etag-1',
            },
          },
          errors: {},
        },
      },
    });
    const observedValues: ReturnType<typeof useImagePreviewQueue>[] = [];
    const onValue = (value: ReturnType<typeof useImagePreviewQueue>) => {
      observedValues.push(value);
    };

    render(<PreviewQueueHarness files={[makeImageFile(1)]} onValue={onValue} />);

    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      const latestValue = observedValues.at(-1);
      expect(latestValue?.imageUrls[1]).toBe('/medical-image-files/objects/xray-1.png?sig=1');
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
