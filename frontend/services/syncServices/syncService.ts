import { SyncScanFile, SyncServiceConfig, SyncStatsResponse } from './types';

function buildHeaders(
  config: SyncServiceConfig,
  headers?: HeadersInit,
  includeJsonContentType: boolean = true
): Headers {
  const merged = new Headers(headers);
  if (includeJsonContentType && !merged.has('Content-Type')) {
    merged.set('Content-Type', 'application/json');
  }
  if (config.apiKey) {
    merged.set('X-API-Key', config.apiKey);
  }
  return merged;
}

async function requestSyncJson<T>(
  config: SyncServiceConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${config.serviceUrl}${path}`, {
    ...init,
    headers: buildHeaders(config, init.headers),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
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

export async function inspectSyncFile(
  config: SyncServiceConfig,
  fileId: number
): Promise<any> {
  return requestSyncJson<any>(config, `/api/v1/files/${fileId}/inspect`);
}

export async function downloadSyncPreviewImage(
  config: SyncServiceConfig,
  fileId: number
): Promise<Blob> {
  const response = await fetch(
    `${config.serviceUrl}/api/v1/files/${fileId}/preview-image`,
    {
      headers: buildHeaders(config, undefined, false),
    }
  );
  if (!response.ok) {
    throw new Error(`图像转换失败: ${response.status}`);
  }
  return response.blob();
}

export async function markSyncFileSynced(
  config: SyncServiceConfig,
  fileId: number
): Promise<void> {
  await requestSyncJson(config, `/api/v1/files/${fileId}/mark-synced`, {
    method: 'POST',
  });
}
