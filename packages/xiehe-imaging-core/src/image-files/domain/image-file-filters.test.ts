import { describe, expect, it } from 'vitest';

import {
  buildImageFileFilters,
  buildImagingListHref,
} from './image-file-filters';

describe('image file filters', () => {
  it('builds API filters and a returnable list href', () => {
    const input = {
      page: 3,
      searchTerm: '张三',
      examType: '正位X光片',
      processingStatus: 'PROCESSED' as const,
      dateFrom: '2026-06-01',
      dateTo: '2026-06-12',
      uploadedBy: 7,
      teamIds: [11, 12],
    };
    expect(buildImageFileFilters({ ...input, pageSize: 20 })).toMatchObject({
      page: 3,
      page_size: 20,
      uploaded_by: 7,
      team_ids: [11, 12],
    });
    expect(
      buildImagingListHref({
        ...input,
        viewMode: 'list',
        uploaderName: '王医生',
      })
    ).toContain('page=3');
  });
});
