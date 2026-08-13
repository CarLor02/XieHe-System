import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearCachedImageFileAccessUrl,
  getImageFileAccessUrls,
} from '@/services/imageServices/imageFileAccessUrlService';
import type { ImageFile } from '@/services/imageServices/imageFileService';
import { createLogger } from '@/lib/logger';
import {
  planPreviewRenderFailure,
  shouldRetryPreviewBatchRequest,
} from '@xiehe/imaging-core/image-files';

const logger = createLogger(
  'app.imaging.features.image.preview.hooks.useImagePreviewQueue'
);

const PREVIEW_REQUEST_TIMEOUT_MS = 60_000;
const PREVIEW_RETRY_ATTEMPTS = 3;
const PREVIEW_RETRY_DELAY_MS = 800;
const DEFAULT_PREVIEW_DOWNLOAD_CONCURRENCY = 4;

export function parsePreviewDownloadConcurrency(
  value: string | undefined
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1
    ? parsed
    : DEFAULT_PREVIEW_DOWNLOAD_CONCURRENCY;
}

const PREVIEW_DOWNLOAD_CONCURRENCY = parsePreviewDownloadConcurrency(
  process.env.NEXT_PUBLIC_IMAGE_PREVIEW_DOWNLOAD_CONCURRENCY
);

export type PreviewLoadState = 'fallback';

function delay(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useImagePreviewQueue(imageFiles: ImageFile[]) {
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [previewStates, setPreviewStates] = useState<
    Record<number, PreviewLoadState>
  >({});
  const [previewRetryVersion, setPreviewRetryVersion] = useState(0);
  const imageUrlsRef = useRef<Record<number, string>>({});
  const resolvedImageUrlsRef = useRef<Record<number, string>>({});
  const previewStatesRef = useRef<Record<number, PreviewLoadState>>({});
  const previewControllerRef = useRef<AbortController | null>(null);
  const previewQueueVersionRef = useRef(0);
  const orderedFileIdsRef = useRef<number[]>([]);
  const activeDownloadIdsRef = useRef<Set<number>>(new Set());
  const completedDownloadIdsRef = useRef<Set<number>>(new Set());
  const previewForceRefreshIdsRef = useRef<Set<number>>(new Set());
  const previewErrorCountsRef = useRef<Record<number, number>>({});

  const abortAllPreviewRequests = useCallback(() => {
    previewControllerRef.current?.abort();
    previewControllerRef.current = null;
  }, []);

  const resetPreviewQueue = useCallback(() => {
    previewQueueVersionRef.current += 1;
    previewForceRefreshIdsRef.current.clear();
    previewErrorCountsRef.current = {};
    abortAllPreviewRequests();
    imageUrlsRef.current = {};
    resolvedImageUrlsRef.current = {};
    previewStatesRef.current = {};
    orderedFileIdsRef.current = [];
    activeDownloadIdsRef.current.clear();
    completedDownloadIdsRef.current.clear();
    setImageUrls({});
    setPreviewStates({});
  }, [abortAllPreviewRequests]);

  const schedulePreviewDownloads = useCallback(() => {
    let availableSlots =
      PREVIEW_DOWNLOAD_CONCURRENCY - activeDownloadIdsRef.current.size;
    if (availableSlots <= 0) return;

    const nextUrls = { ...imageUrlsRef.current };
    let changed = false;

    // URL 获取可以批量完成，但只按当前列表顺序向 img 放行真实下载。
    for (const fileId of orderedFileIdsRef.current) {
      if (availableSlots <= 0) break;
      if (
        activeDownloadIdsRef.current.has(fileId) ||
        completedDownloadIdsRef.current.has(fileId) ||
        previewStatesRef.current[fileId] === 'fallback'
      ) {
        continue;
      }

      const resolvedUrl = resolvedImageUrlsRef.current[fileId];
      if (!resolvedUrl) continue;

      activeDownloadIdsRef.current.add(fileId);
      nextUrls[fileId] = resolvedUrl;
      availableSlots -= 1;
      changed = true;
    }

    if (changed) {
      imageUrlsRef.current = nextUrls;
      setImageUrls(nextUrls);
    }
  }, []);

  const handlePreviewLoad = useCallback(
    (fileId: number) => {
      if (!activeDownloadIdsRef.current.delete(fileId)) return;
      completedDownloadIdsRef.current.add(fileId);
      schedulePreviewDownloads();
    },
    [schedulePreviewDownloads]
  );

  const handlePreviewError = useCallback(
    (fileId: number) => {
      if (!activeDownloadIdsRef.current.has(fileId)) return;

      clearCachedImageFileAccessUrl(fileId);

      const decision = planPreviewRenderFailure(
        previewErrorCountsRef.current[fileId] ?? 0
      );
      previewErrorCountsRef.current[fileId] = decision.failureCount;

      const nextUrls = { ...imageUrlsRef.current };
      delete nextUrls[fileId];
      imageUrlsRef.current = nextUrls;
      delete resolvedImageUrlsRef.current[fileId];
      setImageUrls(nextUrls);

      if (decision.action === 'refresh-access-url') {
        // URL 刷新属于同一次下载重试，继续占用槽位以免突破并发上限。
        previewForceRefreshIdsRef.current.add(fileId);
        const nextStates = { ...previewStatesRef.current };
        delete nextStates[fileId];
        previewStatesRef.current = nextStates;
        setPreviewStates(nextStates);
        setPreviewRetryVersion(version => version + 1);
        return;
      }

      activeDownloadIdsRef.current.delete(fileId);
      completedDownloadIdsRef.current.add(fileId);
      const nextStates = {
        ...previewStatesRef.current,
        [fileId]: 'fallback' as const,
      };
      previewStatesRef.current = nextStates;
      setPreviewStates(nextStates);
      schedulePreviewDownloads();
    },
    [schedulePreviewDownloads]
  );

  useEffect(() => {
    return () => {
      abortAllPreviewRequests();
    };
  }, [abortAllPreviewRequests]);

  useEffect(() => {
    abortAllPreviewRequests();

    const currentFileIds = new Set(imageFiles.map(file => file.id));
    orderedFileIdsRef.current = imageFiles.map(file => file.id);

    setImageUrls(previousUrls => {
      const nextUrls: Record<number, string> = {};
      for (const [idString, url] of Object.entries(previousUrls)) {
        const id = Number(idString);
        if (currentFileIds.has(id)) {
          nextUrls[id] = url;
        }
      }
      imageUrlsRef.current = nextUrls;
      return nextUrls;
    });

    resolvedImageUrlsRef.current = Object.fromEntries(
      Object.entries(resolvedImageUrlsRef.current).filter(([id]) =>
        currentFileIds.has(Number(id))
      )
    );
    activeDownloadIdsRef.current = new Set(
      [...activeDownloadIdsRef.current].filter(id => currentFileIds.has(id))
    );
    completedDownloadIdsRef.current = new Set(
      [...completedDownloadIdsRef.current].filter(id => currentFileIds.has(id))
    );

    setPreviewStates(previousStates => {
      const nextStates: Record<number, PreviewLoadState> = {};
      for (const [idString, state] of Object.entries(previousStates)) {
        const id = Number(idString);
        if (currentFileIds.has(id)) {
          nextStates[id] = state;
        }
      }
      previewStatesRef.current = nextStates;
      return nextStates;
    });

    previewForceRefreshIdsRef.current.forEach(fileId => {
      if (!currentFileIds.has(fileId)) {
        previewForceRefreshIdsRef.current.delete(fileId);
      }
    });
    for (const idString of Object.keys(previewErrorCountsRef.current)) {
      if (!currentFileIds.has(Number(idString))) {
        delete previewErrorCountsRef.current[Number(idString)];
      }
    }

    if (imageFiles.length === 0) {
      previewQueueVersionRef.current += 1;
      return;
    }

    const queueVersion = ++previewQueueVersionRef.current;
    const pendingFiles = imageFiles.filter(
      file =>
        !resolvedImageUrlsRef.current[file.id] &&
        !completedDownloadIdsRef.current.has(file.id) &&
        previewStatesRef.current[file.id] !== 'fallback'
    );

    if (pendingFiles.length === 0) {
      schedulePreviewDownloads();
      return;
    }

    const controller = new AbortController();
    previewControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, PREVIEW_REQUEST_TIMEOUT_MS);

    const loadPreviews = async () => {
      for (let attempt = 1; attempt <= PREVIEW_RETRY_ATTEMPTS; attempt += 1) {
        if (previewQueueVersionRef.current !== queueVersion) return;

        try {
          const forceRefreshIds = new Set(previewForceRefreshIdsRef.current);
          const result = await getImageFileAccessUrls(pendingFiles, {
            forceRefreshIds,
            signal: controller.signal,
          });

          if (previewQueueVersionRef.current !== queueVersion) return;

          const loadedEntries = Object.entries(result.items).map(
            ([idString, download]) => ({
              fileId: Number(idString),
              url: download.url,
            })
          );
          const loadedIds = new Set(loadedEntries.map(entry => entry.fileId));
          const nextVisibleUrls = { ...imageUrlsRef.current };
          let restoredActiveUrl = false;
          for (const entry of loadedEntries) {
            resolvedImageUrlsRef.current[entry.fileId] = entry.url;
            if (activeDownloadIdsRef.current.has(entry.fileId)) {
              nextVisibleUrls[entry.fileId] = entry.url;
              restoredActiveUrl = true;
            }
          }
          if (restoredActiveUrl) {
            imageUrlsRef.current = nextVisibleUrls;
            setImageUrls(nextVisibleUrls);
          }

          const nextStates = { ...previewStatesRef.current };
          for (const fileId of loadedIds) {
            delete nextStates[fileId];
            // Do NOT reset previewErrorCountsRef here: error counts track
            // image *load* failures (img onError), not URL-fetch successes.
            // Resetting here would cause an infinite retry loop when the
            // presigned URL is valid but the object is missing in MinIO.
            previewForceRefreshIdsRef.current.delete(fileId);
          }
          for (const idString of Object.keys(result.errors)) {
            const fileId = Number(idString);
            nextStates[fileId] = 'fallback';
            if (activeDownloadIdsRef.current.delete(fileId)) {
              completedDownloadIdsRef.current.add(fileId);
            }
          }
          previewStatesRef.current = nextStates;
          setPreviewStates(nextStates);
          schedulePreviewDownloads();
          return;
        } catch (error) {
          if (
            controller.signal.aborted ||
            isAbortError(error) ||
            previewQueueVersionRef.current !== queueVersion
          ) {
            return;
          }

          const shouldRetry = shouldRetryPreviewBatchRequest(
            attempt,
            PREVIEW_RETRY_ATTEMPTS
          );
          logger.warn(
            `Preview URL batch load attempt ${attempt}/${PREVIEW_RETRY_ATTEMPTS} failed:`,
            error
          );

          if (!shouldRetry) {
            const nextStates = { ...previewStatesRef.current };
            for (const file of pendingFiles) {
              nextStates[file.id] = 'fallback';
              if (activeDownloadIdsRef.current.delete(file.id)) {
                completedDownloadIdsRef.current.add(file.id);
              }
            }
            previewStatesRef.current = nextStates;
            setPreviewStates(nextStates);
            schedulePreviewDownloads();
            return;
          }

          await delay(PREVIEW_RETRY_DELAY_MS);
        }
      }
    };

    void loadPreviews().finally(() => {
      window.clearTimeout(timeoutId);
      if (previewControllerRef.current === controller) {
        previewControllerRef.current = null;
      }
    });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    abortAllPreviewRequests,
    imageFiles,
    previewRetryVersion,
    schedulePreviewDownloads,
  ]);

  return {
    imageUrls,
    previewStates,
    resetPreviewQueue,
    handlePreviewLoad,
    handlePreviewError,
  };
}
