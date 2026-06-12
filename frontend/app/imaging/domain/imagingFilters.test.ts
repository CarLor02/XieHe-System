import { describe, expect, it } from '@jest/globals';

import { buildImageFileFilters, buildImagingListHref } from './imagingFilters';

describe('imaging filters', () => {
  it('includes uploader id in image file filters', () => {
    expect(
      buildImageFileFilters({
        page: 3,
        pageSize: 20,
        searchTerm: '张三',
        examType: '正位X光片',
        reviewStatus: 'reviewed',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-12',
        uploadedBy: 7,
      })
    ).toEqual({
      page: 3,
      page_size: 20,
      search: '张三',
      description: '正位X光片',
      review_status: 'reviewed',
      start_date: '2026-06-01',
      end_date: '2026-06-12',
      uploaded_by: 7,
    });
  });

  it('builds a returnable imaging list URL with page and uploader state', () => {
    expect(
      buildImagingListHref({
        page: 3,
        searchTerm: '张三',
        examType: '正位X光片',
        reviewStatus: 'reviewed',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-12',
        viewMode: 'list',
        uploadedBy: 7,
        uploaderName: '王医生',
      })
    ).toBe(
      '/imaging?page=3&search=%E5%BC%A0%E4%B8%89&description=%E6%AD%A3%E4%BD%8DX%E5%85%89%E7%89%87&review_status=reviewed&start_date=2026-06-01&end_date=2026-06-12&view=list&uploaded_by=7&uploader_name=%E7%8E%8B%E5%8C%BB%E7%94%9F'
    );
  });
});
