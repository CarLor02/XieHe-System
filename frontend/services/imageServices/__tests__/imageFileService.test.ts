import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';

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

  expect(formatDate('2026-06-01T05:25:00')).toMatch(/2026.*06.*01.*13.*25/);
});

it('does not apply an extra offset to timestamps that already include a timezone', () => {
  process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = 'Asia/Shanghai';

  expect(formatDate('2026-06-01T13:25:00+08:00')).toMatch(
    /2026.*06.*01.*13.*25/
  );
});

describe('image file list filters', () => {
  it('updates image exam types through the atomic batch endpoint', async () => {
    const patch = jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => ({
        updated_ids: [3],
        unchanged_ids: [4],
        updated_count: 1,
        unchanged_count: 1,
        exam_type: '侧位X光片',
      })
    );

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({ apiClient: { patch } }));
    const { batchUpdateImageExamType } = await import('../imageFileService');

    const result = await batchUpdateImageExamType([3, 4], '侧位X光片');

    expect(patch).toHaveBeenCalledWith('/api/v1/image-files/batch/exam-type', {
      ids: [3, 4],
      exam_type: '侧位X光片',
    });
    expect(result.updated_ids).toEqual([3]);
    expect(result.unchanged_count).toBe(1);

    jest.dontMock('@/infrastructure/http');
  });

  it('renames an image through the filename endpoint', async () => {
    const patch = jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => ({
        id: 7,
        original_filename: 'renamed.png',
      })
    );

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({ apiClient: { patch } }));
    const { renameImageFile } = await import('../imageFileService');

    const result = await renameImageFile(7, 'renamed');

    expect(patch).toHaveBeenCalledWith('/api/v1/image-files/7/filename', {
      basename: 'renamed',
    });
    expect(result.original_filename).toBe('renamed.png');

    jest.dontMock('@/infrastructure/http');
  });

  it('sends uploaded_by when filtering by uploader', async () => {
    const get = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      items: [],
      pagination: {
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      },
    }));

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({
      apiClient: { get },
      normalizeLegacyPagination,
    }));
    const { getImageFiles } = await import('../imageFileService');

    await getImageFiles({ uploaded_by: 7 });

    expect(get).toHaveBeenCalledWith('/api/v1/image-files', {
      params: {
        page: 1,
        page_size: 20,
        uploaded_by: 7,
      },
    });

    jest.dontMock('@/infrastructure/http');
  });

  it('sends the explicit file type and processing status filters', async () => {
    const get = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      items: [],
      pagination: {
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      },
    }));

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({
      apiClient: { get },
      normalizeLegacyPagination,
    }));
    const { getImageFiles } = await import('../imageFileService');

    await getImageFiles({ file_type: 'PNG', file_status: 'PROCESSED' });

    expect(get).toHaveBeenCalledWith('/api/v1/image-files', {
      params: {
        page: 1,
        page_size: 20,
        file_type: 'PNG',
        file_status: 'PROCESSED',
      },
    });

    jest.dontMock('@/infrastructure/http');
  });

  it('saves a versioned annotation snapshot', async () => {
    const put = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      annotation_version: 4,
      annotation_updated_at: '2026-08-02T12:00:00',
      annotation_updated_by: 9,
      has_annotation: true,
      status: 'PROCESSED',
      changed: true,
    }));

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({ apiClient: { put } }));
    const { saveImageAnnotation } = await import('../imageFileService');

    const annotation = {
      schemaVersion: 1 as const,
      measurements: [{ id: 'm1', type: 'length', value: '10mm', points: [] }],
      standardDistance: null,
      standardDistancePoints: null,
    };
    const result = await saveImageAnnotation(8, 3, annotation);

    expect(put).toHaveBeenCalledWith('/api/v1/image-files/8/annotation', {
      expected_version: 3,
      annotation,
    });
    expect(result.annotation_version).toBe(4);

    jest.dontMock('@/infrastructure/http');
  });

  it('loads annotations in a dedicated batch request', async () => {
    const post = jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => ({
        items: [
          { id: 3, annotation: { measurements: [] }, annotation_version: 2 },
        ],
      })
    );

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({ apiClient: { post } }));
    const { getImageAnnotations } = await import('../imageFileService');

    const result = await getImageAnnotations([3]);

    expect(post).toHaveBeenCalledWith('/api/v1/image-files/annotations/batch', {
      ids: [3],
    });
    expect(result[0].annotation_version).toBe(2);

    jest.dontMock('@/infrastructure/http');
  });

  it('chunks annotation requests at the API limit', async () => {
    const post = jest.fn<
      (path: string, body: { ids: number[] }) => Promise<unknown>
    >(async (_path: string, body: { ids: number[] }) => ({
      items: body.ids.map(id => ({
        id,
        annotation: null,
        annotation_version: 0,
      })),
    }));

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({ apiClient: { post } }));
    const { getImageAnnotations } = await import('../imageFileService');
    const ids = Array.from({ length: 101 }, (_, index) => index + 1);

    const result = await getImageAnnotations(ids);

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][1]).toEqual({ ids: ids.slice(0, 100) });
    expect(post.mock.calls[1][1]).toEqual({ ids: [101] });
    expect(result).toHaveLength(101);

    jest.dontMock('@/infrastructure/http');
  });

  it('loads visible uploaders from the image file API', async () => {
    const get = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      items: [{ id: 7, real_name: '王医生', email: 'doctor@example.com' }],
      pagination: {
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    }));

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({
      apiClient: { get },
      normalizeLegacyPagination,
    }));
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

    jest.dontMock('@/infrastructure/http');
  });

  it('loads assignable image teams from the image file API', async () => {
    const get = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
      items: [{ id: 11, name: '骨科团队', member_count: 3, is_member: true }],
      pagination: {
        total: 1,
        page: 2,
        page_size: 10,
        total_pages: 3,
      },
    }));

    jest.resetModules();
    jest.doMock('@/infrastructure/http', () => ({
      apiClient: { get },
      normalizeLegacyPagination,
    }));
    const { getAssignableImageTeams } = await import('../imageFileService');

    const result = await getAssignableImageTeams({
      page: 2,
      page_size: 10,
      search: '骨科',
    });

    expect(get).toHaveBeenCalledWith('/api/v1/image-files/assignable-teams', {
      params: {
        page: 2,
        page_size: 10,
        search: '骨科',
      },
    });
    expect(result.items[0].name).toBe('骨科团队');
    expect(result.totalPages).toBe(3);

    jest.dontMock('@/infrastructure/http');
  });
});
