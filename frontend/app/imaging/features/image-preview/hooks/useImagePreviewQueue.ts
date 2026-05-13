import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearCachedImageFileAccessUrl,
  getImageFileAccessUrls,
} from '@/services/imageServices/imageFileAccessUrlService';
import type { ImageFile } from '@/services/imageServices/imageFileService';

const PREVIEW_REQUEST_TIMEOUT_MS = 60_000;
const PREVIEW_RETRY_ATTEMPTS = 3;
const PREVIEW_RETRY_DELAY_MS = 800;

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
  const previewStatesRef = useRef<Record<number, PreviewLoadState>>({});
  const previewControllerRef = useRef<AbortController | null>(null);
  const previewQueueVersionRef = useRef(0);
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
    previewStatesRef.current = {};
    setImageUrls({});
    setPreviewStates({});
  }, [abortAllPreviewRequests]);

  const handlePreviewError = useCallback((fileId: number) => {
    clearCachedImageFileAccessUrl(fileId);

    const nextAttempts = (previewErrorCountsRef.current[fileId] ?? 0) + 1;
    previewErrorCountsRef.current[fileId] = nextAttempts;

    setImageUrls(previousUrls => {
      const nextUrls = { ...previousUrls };
      delete nextUrls[fileId];
      return nextUrls;
    });

    if (nextAttempts <= 1) {
      previewForceRefreshIdsRef.current.add(fileId);
      setPreviewStates(previousStates => {
        const nextStates = { ...previousStates };
        delete nextStates[fileId];
        return nextStates;
      });
      setPreviewRetryVersion(version => version + 1);
      return;
    }

    setPreviewStates(previousStates => ({
      ...previousStates,
      [fileId]: 'fallback',
    }));
  }, []);

  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  useEffect(() => {
    previewStatesRef.current = previewStates;
  }, [previewStates]);

  useEffect(() => {
    return () => {
      abortAllPreviewRequests();
    };
  }, [abortAllPreviewRequests]);

  useEffect(() => {
    abortAllPreviewRequests();

    const currentFileIds = new Set(imageFiles.map(file => file.id));

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
        !imageUrlsRef.current[file.id] &&
        previewStatesRef.current[file.id] !== 'fallback'
    );

    if (pendingFiles.length === 0) return;

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
          setImageUrls(previousUrls => {
            const nextUrls = { ...previousUrls };
            for (const entry of loadedEntries) {
              nextUrls[entry.fileId] = entry.url;
            }
            imageUrlsRef.current = nextUrls;
            return nextUrls;
          });

          setPreviewStates(previousStates => {
            const nextStates = { ...previousStates };
            for (const fileId of loadedIds) {
              delete nextStates[fileId];
              // Do NOT reset previewErrorCountsRef here: error counts track
              // image *load* failures (img onError), not URL-fetch successes.
              // Resetting here would cause an infinite retry loop when the
              // presigned URL is valid but the object is missing in MinIO.
              previewForceRefreshIdsRef.current.delete(fileId);
            }
            for (const idString of Object.keys(result.errors)) {
              nextStates[Number(idString)] = 'fallback';
            }
            previewStatesRef.current = nextStates;
            return nextStates;
          });
          return;
        } catch (error) {
          if (
            controller.signal.aborted ||
            isAbortError(error) ||
            previewQueueVersionRef.current !== queueVersion
          ) {
            return;
          }

          const isLastAttempt = attempt === PREVIEW_RETRY_ATTEMPTS;
          console.warn(
            `Preview URL batch load attempt ${attempt}/${PREVIEW_RETRY_ATTEMPTS} failed:`,
            error
          );

          if (isLastAttempt) {
            setPreviewStates(previousStates => {
              const nextStates = { ...previousStates };
              for (const file of pendingFiles) {
                nextStates[file.id] = 'fallback';
              }
              previewStatesRef.current = nextStates;
              return nextStates;
            });
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
  ]);

  return {
    imageUrls,
    previewStates,
    resetPreviewQueue,
    handlePreviewError,
  };
}
