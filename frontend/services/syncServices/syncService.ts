import { createExternalHttpClient } from '@/infrastructure/http';
import { createSyncClient as createSharedSyncClient } from '@xiehe/api-sdk';
import type {
  SyncScanFile,
  SyncServiceConfig,
  SyncStatsResponse,
} from './types';

function createClients(config: SyncServiceConfig) {
  const httpClient = createExternalHttpClient({
    baseURL: config.serviceUrl,
    headers: config.apiKey ? { 'X-API-Key': config.apiKey } : undefined,
  });
  return { httpClient, syncClient: createSharedSyncClient(httpClient) };
}

export function getSyncStats(
  config: SyncServiceConfig
): Promise<SyncStatsResponse> {
  return createClients(config).syncClient.getStats();
}

export function getSyncFiles(
  config: SyncServiceConfig,
  params: URLSearchParams
): Promise<SyncScanFile[]> {
  return createClients(config).syncClient.listFiles(
    Object.fromEntries(params.entries())
  );
}

export function inspectSyncFile<T = unknown>(
  config: SyncServiceConfig,
  fileId: number
): Promise<T> {
  return createClients(config).syncClient.inspectFile<T>(fileId);
}

export function downloadSyncPreviewImage(
  config: SyncServiceConfig,
  fileId: number
): Promise<Blob> {
  return createClients(config).httpClient.get<Blob>(
    `/api/v1/files/${fileId}/preview-image`,
    {
      auth: 'none',
      responseMode: 'raw',
      responseType: 'blob',
    }
  );
}

export async function markSyncFileSynced(
  config: SyncServiceConfig,
  fileId: number
): Promise<void> {
  await createClients(config).syncClient.markFileSynced(fileId);
}
