const LOCAL_ANNOTATION_PREFIX = 'annotations_';

export const LOCAL_ANNOTATION_CACHE_INDEX_KEY = 'annotation_cache_index';

const DEFAULT_MAX_ENTRIES = 20;
const DEFAULT_MAX_TOTAL_CHARS = 3 * 1024 * 1024;

export interface LocalAnnotationCacheEntry {
  key: string;
  imageId: string;
  updatedAt: number;
  size: number;
}

export interface SaveLocalAnnotationBackupOptions {
  maxEntries?: number;
  maxTotalChars?: number;
  now?: () => number;
}

export type SaveLocalAnnotationBackupResult =
  | { saved: true }
  | { saved: false; reason: 'quota' | 'unavailable' | 'unknown' };

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }

  return null;
}

function isAnnotationKey(key: string | null): key is string {
  return Boolean(key?.startsWith(LOCAL_ANNOTATION_PREFIX));
}

function toImageId(key: string): string {
  return key.slice(LOCAL_ANNOTATION_PREFIX.length);
}

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return false;
}

function readCacheIndex(storage: Storage): LocalAnnotationCacheEntry[] {
  try {
    const raw = storage.getItem(LOCAL_ANNOTATION_CACHE_INDEX_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is LocalAnnotationCacheEntry =>
        typeof entry?.key === 'string' &&
        isAnnotationKey(entry.key) &&
        typeof entry.imageId === 'string' &&
        typeof entry.updatedAt === 'number' &&
        typeof entry.size === 'number'
    );
  } catch {
    return [];
  }
}

function collectAnnotationKeys(storage: Storage): string[] {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (isAnnotationKey(key)) {
      keys.push(key);
    }
  }

  return keys;
}

function collectAnnotationEntries(storage: Storage): LocalAnnotationCacheEntry[] {
  const indexedEntries = new Map(
    readCacheIndex(storage).map(entry => [entry.key, entry])
  );
  const entries = new Map<string, LocalAnnotationCacheEntry>();

  for (const key of collectAnnotationKeys(storage)) {
    const value = storage.getItem(key);
    const indexedEntry = indexedEntries.get(key);
    entries.set(key, {
      key,
      imageId: indexedEntry?.imageId ?? toImageId(key),
      updatedAt: indexedEntry?.updatedAt ?? 0,
      size: value?.length ?? indexedEntry?.size ?? 0,
    });
  }

  return Array.from(entries.values());
}

function writeCacheIndex(
  storage: Storage,
  entries: LocalAnnotationCacheEntry[]
) {
  const sortedEntries = [...entries].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }

    return left.key.localeCompare(right.key);
  });

  storage.setItem(
    LOCAL_ANNOTATION_CACHE_INDEX_KEY,
    JSON.stringify(sortedEntries)
  );
}

function removeAnnotationEntry(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // localStorage cleanup is best-effort; saving to the server must continue.
  }
}

function pruneAnnotationCache(
  storage: Storage,
  currentKey: string,
  pendingSize: number,
  options: Required<SaveLocalAnnotationBackupOptions>
) {
  const removableEntries = collectAnnotationEntries(storage)
    .filter(entry => entry.key !== currentKey)
    .sort((left, right) => {
      if (left.updatedAt !== right.updatedAt) {
        return left.updatedAt - right.updatedAt;
      }

      return left.key.localeCompare(right.key);
    });
  const maxOtherEntries = Math.max(0, options.maxEntries - 1);
  let retainedCount = removableEntries.length;
  let retainedTotalSize =
    pendingSize +
    removableEntries.reduce((total, entry) => total + entry.size, 0);

  for (const entry of removableEntries) {
    if (
      retainedCount <= maxOtherEntries &&
      retainedTotalSize <= options.maxTotalChars
    ) {
      break;
    }

    removeAnnotationEntry(storage, entry.key);
    retainedCount -= 1;
    retainedTotalSize -= entry.size;
  }
}

function removeOtherAnnotationBackups(storage: Storage, currentKey: string) {
  for (const key of collectAnnotationKeys(storage)) {
    if (key !== currentKey) {
      removeAnnotationEntry(storage, key);
    }
  }
}

function normalizeOptions(
  options: SaveLocalAnnotationBackupOptions
): Required<SaveLocalAnnotationBackupOptions> {
  return {
    maxEntries: Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES),
    maxTotalChars: Math.max(1, options.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS),
    now: options.now ?? Date.now,
  };
}

function writeUpdatedIndex(
  storage: Storage,
  entry: LocalAnnotationCacheEntry
) {
  const entries = collectAnnotationEntries(storage).filter(
    existingEntry => existingEntry.key !== entry.key
  );

  entries.push(entry);

  try {
    writeCacheIndex(storage, entries);
  } catch {
    try {
      storage.removeItem(LOCAL_ANNOTATION_CACHE_INDEX_KEY);
    } catch {
      // Ignore index cleanup failure; annotation backup itself has been saved.
    }
  }
}

export function saveLocalAnnotationBackup(
  imageId: string,
  data: unknown,
  options: SaveLocalAnnotationBackupOptions = {}
): SaveLocalAnnotationBackupResult {
  const storage = getStorage();
  if (!storage) {
    return { saved: false, reason: 'unavailable' };
  }

  const normalizedOptions = normalizeOptions(options);
  const key = `${LOCAL_ANNOTATION_PREFIX}${imageId}`;
  let serialized: string;

  try {
    serialized = JSON.stringify(data);
  } catch {
    return { saved: false, reason: 'unknown' };
  }

  try {
    pruneAnnotationCache(storage, key, serialized.length, normalizedOptions);
    storage.setItem(key, serialized);
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      return { saved: false, reason: 'unknown' };
    }

    removeOtherAnnotationBackups(storage, key);

    try {
      storage.setItem(key, serialized);
    } catch (retryError) {
      return {
        saved: false,
        reason: isQuotaExceededError(retryError) ? 'quota' : 'unknown',
      };
    }
  }

  writeUpdatedIndex(storage, {
    key,
    imageId,
    size: serialized.length,
    updatedAt: normalizedOptions.now(),
  });

  return { saved: true };
}
