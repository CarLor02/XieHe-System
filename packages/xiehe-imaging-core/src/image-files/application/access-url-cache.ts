export interface ImageAccessIdentity {
  id: number;
  fileUuid: string;
  storageEtag?: string | null;
  storageBucket?: string | null;
  objectKey?: string | null;
  variant?: 'original' | 'thumbnail';
}

export interface ImageAccessUrl {
  url: string;
  expiresIn: number;
  expiresAt?: string | null;
  etag?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
}

interface CachedImageAccessUrl {
  url: string;
  expiresAt: number;
  etag?: string;
  filename?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface ImageAccessUrlCache {
  get(file: ImageAccessIdentity): ImageAccessUrl | null;
  set(file: ImageAccessIdentity, access: ImageAccessUrl): void;
  clear(): void;
  clearFile(fileId: number): void;
}

function getFileVersion(file: ImageAccessIdentity): string {
  if (file.storageEtag) return file.storageEtag;
  if (file.storageBucket && file.objectKey) {
    return `${file.storageBucket}:${file.objectKey}`;
  }
  return file.fileUuid;
}

function getCacheKey(file: ImageAccessIdentity): string {
  return `${file.id}:${file.variant ?? 'original'}:${getFileVersion(file)}`;
}

export function createImageAccessUrlCache(
  options: {
    now?: () => number;
    expirySkewMs?: number;
  } = {}
): ImageAccessUrlCache {
  const now = options.now ?? (() => Date.now());
  const expirySkewMs = options.expirySkewMs ?? 60_000;
  const entries = new Map<string, CachedImageAccessUrl>();

  return {
    get(file) {
      const entry = entries.get(getCacheKey(file));
      if (!entry || entry.expiresAt - now() <= expirySkewMs) return null;
      return {
        url: entry.url,
        expiresIn: Math.max(Math.floor((entry.expiresAt - now()) / 1000), 0),
        expiresAt: new Date(entry.expiresAt).toISOString(),
        etag: entry.etag,
        filename: entry.filename,
        mimeType: entry.mimeType,
        width: entry.width,
        height: entry.height,
        fileSize: entry.fileSize,
      };
    },
    set(file, access) {
      const parsedExpiresAt = access.expiresAt
        ? Date.parse(access.expiresAt)
        : Number.NaN;
      entries.set(getCacheKey(file), {
        url: access.url,
        expiresAt: Number.isNaN(parsedExpiresAt)
          ? now() + access.expiresIn * 1000
          : parsedExpiresAt,
        etag: access.etag ?? file.storageEtag ?? undefined,
        filename: access.filename ?? undefined,
        mimeType: access.mimeType ?? undefined,
        width: access.width ?? undefined,
        height: access.height ?? undefined,
        fileSize: access.fileSize ?? undefined,
      });
    },
    clear() {
      entries.clear();
    },
    clearFile(fileId) {
      const prefix = `${fileId}:`;
      for (const key of entries.keys()) {
        if (key.startsWith(prefix)) entries.delete(key);
      }
    },
  };
}

export async function resolveImageAccessUrl(input: {
  file: ImageAccessIdentity;
  cache: ImageAccessUrlCache;
  load: (fileId: number) => Promise<ImageAccessUrl>;
  forceRefresh?: boolean;
}): Promise<string> {
  const cached = input.forceRefresh ? null : input.cache.get(input.file);
  if (cached) return cached.url;

  const access = await input.load(input.file.id);
  input.cache.set(input.file, access);
  return access.url;
}

export async function resolveImageAccessUrls<TError>(input: {
  files: readonly ImageAccessIdentity[];
  cache: ImageAccessUrlCache;
  loadMany: (fileIds: number[]) => Promise<{
    items: Record<number, ImageAccessUrl>;
    errors: Record<number, TError>;
  }>;
  forceRefreshIds?: ReadonlySet<number>;
}): Promise<{
  items: Record<number, ImageAccessUrl>;
  errors: Record<number, TError>;
}> {
  const items: Record<number, ImageAccessUrl> = {};
  const missing: ImageAccessIdentity[] = [];

  for (const file of input.files) {
    const cached = input.forceRefreshIds?.has(file.id)
      ? null
      : input.cache.get(file);
    if (cached) items[file.id] = cached;
    else missing.push(file);
  }

  if (missing.length === 0) return { items, errors: {} };

  const loaded = await input.loadMany(missing.map(file => file.id));
  const fileById = new Map(missing.map(file => [file.id, file]));
  for (const [idText, access] of Object.entries(loaded.items)) {
    const fileId = Number(idText);
    const file = fileById.get(fileId);
    if (file) input.cache.set(file, access);
    items[fileId] = access;
  }

  return { items, errors: loaded.errors };
}
