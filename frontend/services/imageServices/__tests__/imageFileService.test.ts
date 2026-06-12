import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { formatDate } from '../imageFileService';

const originalDisplayTimeZone = process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE;

afterEach(() => {
  if (originalDisplayTimeZone === undefined) {
    delete process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE;
  } else {
    process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = originalDisplayTimeZone;
  }
});

it('formats timezone-less API timestamps as UTC in the configured display timezone', () => {
  process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = 'Asia/Shanghai';

  expect(formatDate('2026-06-01T05:25:00')).toMatch(
    /2026.*06.*01.*13.*25/
  );
});

it('does not apply an extra offset to timestamps that already include a timezone', () => {
  process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = 'Asia/Shanghai';

  expect(formatDate('2026-06-01T13:25:00+08:00')).toMatch(
    /2026.*06.*01.*13.*25/
  );
});

describe('image file list filters', () => {
  it('sends uploaded_by when filtering by uploader', async () => {
    const get = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      data: {
        code: 200,
        data: {
          items: [],
          pagination: {
            total: 0,
            page: 1,
            page_size: 20,
            total_pages: 0,
          },
        },
      },
    }));

    jest.resetModules();
    jest.doMock('@/lib/api', () => ({ apiClient: { get } }));
    const { getImageFiles } = await import('../imageFileService');

    await getImageFiles({ uploaded_by: 7 });

    expect(get).toHaveBeenCalledWith('/api/v1/image-files', {
      params: {
        page: 1,
        page_size: 20,
        uploaded_by: 7,
      },
    });

    jest.dontMock('@/lib/api');
  });

  it('loads visible uploaders from the image file API', async () => {
    const get = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      data: {
        code: 200,
        data: {
          items: [{ id: 7, real_name: '王医生', email: 'doctor@example.com' }],
          pagination: {
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
          },
        },
      },
    }));

    jest.resetModules();
    jest.doMock('@/lib/api', () => ({ apiClient: { get } }));
    const { getVisibleImageUploaders } = await import('../imageFileService');

    const result = await getVisibleImageUploaders({
      page: 1,
      page_size: 10,
      search: '王医生',
    });

    expect(get).toHaveBeenCalledWith('/api/v1/image-files/uploaders', {
      params: {
        page: 1,
        page_size: 10,
        search: '王医生',
      },
    });
    expect(result.items[0].real_name).toBe('王医生');

    jest.dontMock('@/lib/api');
  });
});
