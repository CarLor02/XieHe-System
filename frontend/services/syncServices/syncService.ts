import { SyncScanFile, SyncServiceConfig, SyncStatsResponse } from './types';
import { createExternalHttpClient } from '@/infrastructure/http';

function createSyncClient(config: SyncServiceConfig) {
  return createExternalHttpClient({
    baseURL: config.serviceUrl,
    headers: config.apiKey ? { 'X-API-Key': config.apiKey } : undefined,
  });
}

async function requestSyncJson<T>(
  config: SyncServiceConfig,
  path: string,
  method: 'GET' | 'POST' = 'GET'
): Promise<T> {
  return createSyncClient(config).request<T>({
    method,
    url: path,
    auth: 'none',
    responseMode: 'raw',
  });
}

export async function getSyncStats(
  config: SyncServiceConfig
): Promise<SyncStatsResponse> {
  return requestSyncJson<SyncStatsResponse>(config, '/api/v1/stats');
}

export async function getSyncFiles(
  config: SyncServiceConfig,
  params: URLSearchParams
): Promise<SyncScanFile[]> {
  const result = await requestSyncJson<{ items?: SyncScanFile[] }>(
    config,
    `/api/v1/files?${params.toString()}`
  );
  return result.items || [];
}

export async function inspectSyncFile<T = unknown>(
  config: SyncServiceConfig,
  fileId: number
): Promise<T> {
  return requestSyncJson<T>(config, `/api/v1/files/${fileId}/inspect`);
}

export async function downloadSyncPreviewImage(
  config: SyncServiceConfig,
  fileId: number
): Promise<Blob> {
  return createSyncClient(config).get<Blob>(
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
  await requestSyncJson(config, `/api/v1/files/${fileId}/mark-synced`, 'POST');
}
