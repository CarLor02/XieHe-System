import {
  getImageFileDownloadUrl,
  getImageFileDownloadUrls,
  type ImageFile,
  type ImageFileDownloadUrl,
  type ImageFileDownloadUrlsResponse,
} from './imageFileService';

const EXPIRY_SKEW_MS = 60_000;

export type ImageFileAccessUrlLoader = (
  fileId: number
) => Promise<ImageFileDownloadUrl>;

interface CachedImageFileAccessUrl {
  url: string;
  expiresAt: number;
  etag?: string;
}

const accessUrlCache = new Map<string, CachedImageFileAccessUrl>();

function getFileVersion(file: ImageFile): string {
  if (file.storage_etag) return file.storage_etag;
  if (file.storage_bucket && file.object_key) {
    return `${file.storage_bucket}:${file.object_key}`;
  }
  return file.file_uuid;
}

function getCacheKey(file: ImageFile): string {
  return `${file.id}:${getFileVersion(file)}`;
}

function resolveExpiresAt(download: ImageFileDownloadUrl): number {
  if (download.expires_at) {
    const parsed = Date.parse(download.expires_at);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return Date.now() + download.expires_in * 1000;
}

function isCacheUsable(entry: CachedImageFileAccessUrl): boolean {
  return entry.expiresAt - Date.now() > EXPIRY_SKEW_MS;
}

function buildDownloadFromCache(entry: CachedImageFileAccessUrl): ImageFileDownloadUrl {
  return {
    url: entry.url,
    expires_in: Math.max(Math.floor((entry.expiresAt - Date.now()) / 1000), 0),
    expires_at: new Date(entry.expiresAt).toISOString(),
    etag: entry.etag,
  };
}

function cacheDownload(file: ImageFile, download: ImageFileDownloadUrl): void {
  accessUrlCache.set(getCacheKey(file), {
    url: download.url,
    expiresAt: resolveExpiresAt(download),
    etag: download.etag ?? file.storage_etag,
  });
}

export function clearImageFileAccessUrlCache(): void {
  accessUrlCache.clear();
}

export function clearCachedImageFileAccessUrl(fileId: number): void {
  const keyPrefix = `${fileId}:`;
  for (const key of accessUrlCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      accessUrlCache.delete(key);
    }
  }
}

export async function getImageFileAccessUrl(
  file: ImageFile,
  options: {
    forceRefresh?: boolean;
    loader?: ImageFileAccessUrlLoader;
  } = {}
): Promise<string> {
  const cacheKey = getCacheKey(file);
  const cached = accessUrlCache.get(cacheKey);

  if (!options.forceRefresh && cached && isCacheUsable(cached)) {
    return cached.url;
  }

  const loader = options.loader ?? getImageFileDownloadUrl;
  const download = await loader(file.id);
  cacheDownload(file, download);
  return download.url;
}

export async function getImageFileAccessUrls(
  files: ImageFile[],
  options: {
    forceRefreshIds?: Set<number>;
    signal?: AbortSignal;
  } = {}
): Promise<ImageFileDownloadUrlsResponse> {
  const items: ImageFileDownloadUrlsResponse['items'] = {};
  const errors: ImageFileDownloadUrlsResponse['errors'] = {};
  const missingFiles: ImageFile[] = [];

  for (const file of files) {
    const cached = accessUrlCache.get(getCacheKey(file));
    const forceRefresh = options.forceRefreshIds?.has(file.id) ?? false;

    if (!forceRefresh && cached && isCacheUsable(cached)) {
      items[file.id] = buildDownloadFromCache(cached);
    } else {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length === 0) {
    return { items, errors };
  }

  const batchResponse = await getImageFileDownloadUrls(
    missingFiles.map(file => file.id),
    { signal: options.signal }
  );
  const fileById = new Map(missingFiles.map(file => [file.id, file]));

  for (const [idString, download] of Object.entries(batchResponse.items)) {
    const fileId = Number(idString);
    const file = fileById.get(fileId);
    if (file) {
      cacheDownload(file, download);
    }
    items[fileId] = download;
  }

  for (const [idString, error] of Object.entries(batchResponse.errors)) {
    errors[Number(idString)] = error;
  }

  return { items, errors };
}
