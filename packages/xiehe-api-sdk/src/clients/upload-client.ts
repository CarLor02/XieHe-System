import type { HttpClient } from '@xiehe/api-client';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';
import type {
  CompleteUploadRequest,
  CompleteImageImportItemRequest,
  CreateImageUploadSessionRequest,
  CreatedImageImportBatch,
  ImageImportBatch,
  ImageImportBatchListQuery,
  ImageImportConfig,
  ImageImportItem,
  ImageImportUploadSession,
  UploadRecord,
  UploadSession,
  UploadStatusRecord,
  BatchCreateUploadFile,
} from '@xiehe/api-contracts';
import { compactQuery } from '../shared/query';

export function createUploadClient(client: HttpClient) {
  return {
    createSession: (request: CreateImageUploadSessionRequest) =>
      client.post<UploadSession, CreateImageUploadSessionRequest>(
        '/api/v1/upload/sessions',
        request
      ),
    completeSession: (sessionId: string, request: CompleteUploadRequest) =>
      client.post<UploadStatusRecord, CompleteUploadRequest>(
        `/api/v1/upload/sessions/${sessionId}/complete`,
        request
      ),
    getImportConfig: () =>
      client.get<ImageImportConfig>('/api/v1/upload/batches/config'),
    createImportBatch: (request: {
      patient_id: number;
      description?: string | null;
      team_ids?: number[];
      files: BatchCreateUploadFile[];
    }) =>
      client.post<CreatedImageImportBatch>(
        '/api/v1/upload/batches',
        request
      ),
    createImportSessions: (batchId: string, itemIds: number[]) =>
      client.post<{ items: ImageImportUploadSession[] }>(
        `/api/v1/upload/batches/${batchId}/sessions`,
        { item_ids: itemIds }
      ),
    completeImportItem: (
      batchId: string,
      itemId: number,
      request: CompleteImageImportItemRequest
    ) =>
      client.post<ImageImportItem>(
        `/api/v1/upload/batches/${batchId}/items/${itemId}/complete`,
        request
      ),
    markImportUploadFailed: (
      batchId: string,
      itemId: number,
      sessionId: string | undefined,
      error: string
    ) =>
      client.post<ImageImportItem>(
        `/api/v1/upload/batches/${batchId}/items/${itemId}/upload-failed`,
        { session_id: sessionId, error }
      ),
    enqueueImportItem: (batchId: string, itemId: number) =>
      client.post<ImageImportItem>(
        `/api/v1/upload/batches/${batchId}/items/${itemId}/enqueue`
      ),
    async listImportBatches(query: ImageImportBatchListQuery = {}) {
      return normalizeLegacyPagination<ImageImportBatch>(
        await client.get<unknown>('/api/v1/upload/batches', {
          params: compactQuery({ ...query }),
        })
      );
    },
    async listImportItems(
      batchId: string,
      query: { page?: number; page_size?: number } = {}
    ) {
      return normalizeLegacyPagination<ImageImportItem>(
        await client.get<unknown>(
          `/api/v1/upload/batches/${batchId}/items`,
          { params: query }
        )
      );
    },
    getStatus: (sessionId: string) =>
      client.get<UploadStatusRecord>(`/api/v1/upload/sessions/${sessionId}`),
    async listRecords(query: { page?: number; page_size?: number } = {}) {
      return normalizeLegacyPagination<UploadRecord>(
        await client.get<unknown>('/api/v1/upload/records', { params: query })
      );
    },
  };
}
