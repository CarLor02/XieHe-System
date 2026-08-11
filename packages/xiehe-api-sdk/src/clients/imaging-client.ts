import type { HttpClient, HttpRequestOptions } from '@xiehe/api-client';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';
import type {
  AnnotationSaveResult,
  BatchUpdateImageExamTypeResult,
  ImageAnnotationBatchItem,
  ImageFile,
  ImageFileDetail,
  ImageFileDownloadUrl,
  ImageFileDownloadUrlsResponse,
  ImageFileListQuery,
  ImageFileListResponse,
  ImageFileStats,
  ImageUploader,
  LateralDetectResponse,
  DetectKeypointsResponse,
  PagedSearchQuery,
  PredictMeasurementsResponse,
  TeamSummary,
} from '@xiehe/api-contracts';
import { compactQuery } from '../shared/query';

function mapListQuery(query: ImageFileListQuery) {
  return compactQuery({
    page: query.page ?? 1,
    page_size: query.page_size ?? 20,
    file_type: query.file_type,
    description: query.description,
    file_status: query.file_status,
    start_date: query.start_date,
    end_date: query.end_date,
    search: query.search,
    uploaded_by: query.uploaded_by,
    team_ids: query.team_ids?.length ? query.team_ids.join(',') : undefined,
  });
}

export function createImagingClient(client: HttpClient) {
  async function list(
    query: ImageFileListQuery = {}
  ): Promise<ImageFileListResponse> {
    const data = await client.get<unknown>('/api/v1/image-files', {
      params: mapListQuery(query),
    });
    const result = normalizeLegacyPagination<ImageFile>(data);
    return {
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
      items: result.items,
    };
  }

  return {
    list,
    async listAll(
      query: Omit<ImageFileListQuery, 'page' | 'page_size'> = {},
      pageSize = 100
    ) {
      const first = await list({ ...query, page: 1, page_size: pageSize });
      const items = [...first.items];
      const pages = Math.max(
        Math.ceil(first.total / Math.max(first.page_size, 1)),
        1
      );
      for (let page = 2; page <= pages; page += 1) {
        items.push(...(await list({ ...query, page, page_size: pageSize })).items);
      }
      return items;
    },
    async listUploaders(query: PagedSearchQuery = {}) {
      const data = await client.get<unknown>('/api/v1/image-files/uploaders', {
        params: compactQuery({ page: 1, page_size: 10, ...query }),
      });
      return normalizeLegacyPagination<ImageUploader>(data);
    },
    async listAssignableTeams(query: PagedSearchQuery = {}) {
      const data = await client.get<unknown>(
        '/api/v1/image-files/assignable-teams',
        { params: compactQuery({ page: 1, page_size: 10, ...query }) }
      );
      return normalizeLegacyPagination<TeamSummary>(data);
    },
    async listPatientImages(patientId: number, page = 1, pageSize = 20) {
      const data = await client.get<unknown>(
        `/api/v1/image-files/patient/${patientId}`,
        { params: { page, page_size: pageSize } }
      );
      const result = normalizeLegacyPagination<ImageFile>(data);
      return {
        total: result.total,
        page: result.page,
        page_size: result.pageSize,
        items: result.items,
      };
    },
    get: (fileId: number) =>
      client.get<ImageFileDetail>(`/api/v1/image-files/${fileId}`),
    async getNavigationIds() {
      return (
        await client.get<{ ids: number[] }>('/api/v1/image-files/navigation')
      ).ids;
    },
    async getAnnotations(ids: number[]) {
      const uniqueIds = [...new Set(ids)];
      const items: ImageAnnotationBatchItem[] = [];
      for (let offset = 0; offset < uniqueIds.length; offset += 100) {
        const response = await client.post<{
          items: ImageAnnotationBatchItem[];
        }>('/api/v1/image-files/annotations/batch', {
          ids: uniqueIds.slice(offset, offset + 100),
        });
        items.push(...response.items);
      }
      return items;
    },
    getDownloadUrl: (fileId: number) =>
      client.get<ImageFileDownloadUrl>(
        `/api/v1/image-files/${fileId}/download-url`
      ),
    getDownloadUrls: (
      ids: number[],
      options: HttpRequestOptions & { variant?: 'original' } = {}
    ) => {
      if (ids.length === 0) {
        return Promise.resolve<ImageFileDownloadUrlsResponse>({
          items: {},
          errors: {},
        });
      }
      const { variant, ...requestOptions } = options;
      return client.post<ImageFileDownloadUrlsResponse>(
        '/api/v1/image-files/download-urls',
        { ids, variant: variant ?? 'original' },
        requestOptions
      );
    },
    delete: (fileId: number) =>
      client.delete<{ message: string; file_id: number }>(
        `/api/v1/image-files/${fileId}`
      ),
    updateExamType: (fileId: number, description: string) =>
      client.patch<{
        id: number;
        description: string;
        warning: string | null;
      }>(`/api/v1/image-files/${fileId}/exam-type`, { description }),
    batchUpdateExamType: (ids: number[], examType: string) =>
      client.patch<BatchUpdateImageExamTypeResult>(
        '/api/v1/image-files/batch/exam-type',
        { ids, exam_type: examType }
      ),
    updateInfo: (
      fileId: number,
      request: { description: string; team_ids: number[] }
    ) =>
      client.patch<ImageFile & { warning?: string | null }>(
        `/api/v1/image-files/${fileId}/info`,
        request
      ),
    rename: (fileId: number, basename: string) =>
      client.patch<ImageFile>(`/api/v1/image-files/${fileId}/filename`, {
        basename,
      }),
    saveAnnotation: (
      fileId: number,
      expectedVersion: number,
      annotation: Record<string, unknown>
    ) =>
      client.put<AnnotationSaveResult>(
        `/api/v1/image-files/${fileId}/annotation`,
        { expected_version: expectedVersion, annotation }
      ),
    getStats: () =>
      client.get<ImageFileStats>('/api/v1/image-files/stats/summary'),
    predict: (fileId: string | number) =>
      client.post<PredictMeasurementsResponse>(
        `/api/v1/image-files/${fileId}/ai/predict`
      ),
    detectKeypoints: (fileId: string | number) =>
      client.post<DetectKeypointsResponse | LateralDetectResponse>(
        `/api/v1/image-files/${fileId}/ai/detect-keypoints`
      ),
  };
}
