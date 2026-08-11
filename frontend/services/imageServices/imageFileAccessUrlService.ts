import {
  createImageAccessUrlCache,
  resolveImageAccessUrl,
  resolveImageAccessUrls,
  type ImageAccessIdentity,
  type ImageAccessUrl,
} from '@xiehe/imaging-core/image-files';

import {
  getImageFileDownloadUrl,
  getImageFileDownloadUrls,
  type ImageFile,
  type ImageFileDownloadUrl,
  type ImageFileDownloadUrlError,
  type ImageFileDownloadUrlsResponse,
} from './imageFileService';

export type ImageFileAccessUrlLoader = (
  fileId: number
) => Promise<ImageFileDownloadUrl>;

const accessUrlCache = createImageAccessUrlCache();

function toAccessIdentity(file: ImageFile): ImageAccessIdentity {
  return {
    id: file.id,
    fileUuid: file.file_uuid,
    storageEtag: file.storage_etag,
    storageBucket: file.storage_bucket,
    objectKey: file.object_key,
  };
}

function toCoreAccessUrl(download: ImageFileDownloadUrl): ImageAccessUrl {
  return {
    url: download.url,
    expiresIn: download.expires_in,
    expiresAt: download.expires_at,
    etag: download.etag,
    filename: download.filename,
    mimeType: download.mime_type,
  };
}

function toApiAccessUrl(download: ImageAccessUrl): ImageFileDownloadUrl {
  return {
    url: download.url,
    expires_in: download.expiresIn,
    expires_at: download.expiresAt ?? undefined,
    etag: download.etag ?? undefined,
    filename: download.filename ?? undefined,
    mime_type: download.mimeType ?? undefined,
  };
}

export function clearImageFileAccessUrlCache(): void {
  accessUrlCache.clear();
}

export function clearCachedImageFileAccessUrl(fileId: number): void {
  accessUrlCache.clearFile(fileId);
}

export async function getImageFileAccessUrl(
  file: ImageFile,
  options: {
    forceRefresh?: boolean;
    loader?: ImageFileAccessUrlLoader;
  } = {}
): Promise<string> {
  const loader = options.loader ?? getImageFileDownloadUrl;
  return resolveImageAccessUrl({
    file: toAccessIdentity(file),
    cache: accessUrlCache,
    forceRefresh: options.forceRefresh,
    load: async fileId => toCoreAccessUrl(await loader(fileId)),
  });
}

export async function getImageFileAccessUrls(
  files: ImageFile[],
  options: {
    forceRefreshIds?: Set<number>;
    signal?: AbortSignal;
  } = {}
): Promise<ImageFileDownloadUrlsResponse> {
  const result = await resolveImageAccessUrls<ImageFileDownloadUrlError>({
    files: files.map(toAccessIdentity),
    cache: accessUrlCache,
    forceRefreshIds: options.forceRefreshIds,
    loadMany: async ids => {
      const response = await getImageFileDownloadUrls(ids, {
        signal: options.signal,
      });
      return {
        items: Object.fromEntries(
          Object.entries(response.items).map(([id, access]) => [
            Number(id),
            toCoreAccessUrl(access),
          ])
        ),
        errors: response.errors,
      };
    },
  });

  return {
    items: Object.fromEntries(
      Object.entries(result.items).map(([id, access]) => [
        Number(id),
        toApiAccessUrl(access),
      ])
    ),
    errors: result.errors,
  };
}
