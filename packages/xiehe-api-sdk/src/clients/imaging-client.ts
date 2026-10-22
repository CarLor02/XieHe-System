import type { HttpApi } from '@stellarmesh/sdk';
import { toPaginatedResult } from '@xiehe/api-client/contracts';
import { createImagingApi } from '../api/imagingApi';
import type { RequestSaveAnnotation } from '@xiehe/api-contracts/generated';
import type { HttpClient, HttpRequestOptions } from '@xiehe/api-client';
import type {
  ImageAnnotationBatchItem,
  ImageFileDownloadUrl,
  ImageFileDownloadUrlsResponse,
  ImageFileListQuery,
  LateralDetectResponse,
  DetectKeypointsResponse,
  PagedSearchQuery,
  PredictMeasurementsResponse,
} from '@xiehe/api-contracts';

export function createImagingClient(http: HttpApi, client: HttpClient) {
  const imagingApi = createImagingApi(http);
  async function list(query: ImageFileListQuery = {}) {
    const data = await imagingApi.requestListImageFiles({
      page: 1,
      page_size: 20,
      ...query,
    });
    return {
      total: data.pagination.total,
      page: data.pagination.page,
      page_size: data.pagination.page_size,
      items: data.items,
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
        items.push(
          ...(await list({ ...query, page, page_size: pageSize })).items
        );
      }
      return items;
    },
    async listUploaders(query: PagedSearchQuery = {}) {
      return toPaginatedResult(
        await imagingApi.requestListVisibleImageUploaders({
          page: 1,
          page_size: 10,
          ...query,
        })
      );
    },
    async listAssignableTeams(query: PagedSearchQuery = {}) {
      return toPaginatedResult(
        await imagingApi.requestListAssignableImageTeams({
          page: 1,
          page_size: 10,
          ...query,
        })
      );
    },
    async listPatientImages(patient_id: number, page = 1, page_size = 20) {
      const data = await imagingApi.requestGetPatientImages({
        patient_id,
        page,
        page_size,
      });
      return {
        total: data.pagination.total,
        page: data.pagination.page,
        page_size: data.pagination.page_size,
        items: data.items,
      };
    },
    get: (file_id: number) => imagingApi.requestGetImageFileDetail({ file_id }),
    listAnnotationHistory: async (file_id: number, page = 1, page_size = 20) =>
      toPaginatedResult(
        await imagingApi.requestListAnnotationHistory({
          file_id,
          page,
          page_size,
        })
      ),
    getAnnotationHistory: (file_id: number, version: number) =>
      imagingApi.requestGetAnnotationHistoryVersion({ file_id, version }),
    getNavigationIds: async () =>
      (await imagingApi.requestListNavigationIds({})).ids,
    async getAnnotations(ids: number[]) {
      const uniqueIds = [...new Set(ids)];
      const items: ImageAnnotationBatchItem[] = [];
      for (let offset = 0; offset < uniqueIds.length; offset += 100) {
        const response = await imagingApi.requestGetAnnotationBatch({
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
      options: HttpRequestOptions & {
        variant?: 'original' | 'thumbnail';
      } = {}
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
    updateExamType: (file_id: number, description: string) =>
      imagingApi.requestUpdateExamType({ file_id, description }),
    batchUpdateExamType: (ids: number[], exam_type: string) =>
      imagingApi.requestBatchUpdateExamType({ ids, exam_type }),
    updateInfo: (
      file_id: number,
      request: { description: string; team_ids: number[] }
    ) => imagingApi.requestUpdateImageInfo({ ...request, file_id }),
    rename: (file_id: number, basename: string) =>
      imagingApi.requestRenameImageFile({ file_id, basename }),
    saveAnnotation: (
      file_id: number,
      expected_version: number,
      annotation: RequestSaveAnnotation['annotation']
    ) =>
      imagingApi.requestSaveAnnotation({
        file_id,
        expected_version,
        annotation,
      }),
    getStats: () => imagingApi.requestGetImageStats({}),
    // 存储代理沿用模型原始 JSON；只跳过成功信封转换，仍保留认证恢复和 HTTP 错误。
    predict: (fileId: string | number) =>
      client.post<PredictMeasurementsResponse>(
        `/api/v1/image-files/${fileId}/ai/predict`,
        undefined,
        { responseMode: 'raw' }
      ),
    detectKeypoints: (fileId: string | number) =>
      client.post<DetectKeypointsResponse | LateralDetectResponse>(
        `/api/v1/image-files/${fileId}/ai/detect-keypoints`
      ),
  };
}
