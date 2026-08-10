import { describe, expect, it } from 'vitest';

import {
  normalizeLegacyPagination,
  toPaginatedResult,
  unwrapApiEnvelope,
} from '../src/contracts';

describe('API contracts', () => {
  it('normalizes the canonical pagination contract', () => {
    expect(
      toPaginatedResult({
        items: [{ id: 1 }],
        pagination: {
          total: 11,
          page: 2,
          page_size: 10,
          total_pages: 2,
        },
      })
    ).toEqual({
      items: [{ id: 1 }],
      total: 11,
      page: 2,
      pageSize: 10,
      totalPages: 2,
    });
  });

  it('keeps historical pagination parsing isolated in one adapter', () => {
    expect(
      normalizeLegacyPagination<number>({
        data: { items: [1, 2], total: 5, page: 1, page_size: 2 },
      })
    ).toEqual({
      items: [1, 2],
      total: 5,
      page: 1,
      pageSize: 2,
      totalPages: 3,
    });
  });

  it('unwraps null and missing envelope data without returning the envelope', () => {
    expect(unwrapApiEnvelope({ code: 200, message: 'ok', data: null })).toBeNull();
    expect(unwrapApiEnvelope({ code: 200, message: 'ok' })).toBeUndefined();
  });
});
