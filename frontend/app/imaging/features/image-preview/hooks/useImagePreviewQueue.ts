import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadImageFile,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

const PREVIEW_REQUEST_TIMEOUT_MS = 60000;
const PREVIEW_RETRY_ATTEMPTS = 3;
const PREVIEW_RETRY_DELAY_MS = 800;
const MAX_CONCURRENT_PREVIEW_LOADS = 6;

export type PreviewLoadState = 'fallback';

function delay(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

export function useImagePreviewQueue(imageFiles: ImageFile[]) {
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [previewStates, setPreviewStates] = useState<
    Record<number, PreviewLoadState>
  >({});
  const imageUrlsRef = useRef<Record<number, string>>({});
  const previewStatesRef = useRef<Record<number, PreviewLoadState>>({});
  const previewLoadingIdsRef = useRef<Set<number>>(new Set());
  const previewControllersRef = useRef<Map<number, AbortController>>(new Map());
  const previewQueueVersionRef = useRef(0);

  const abortAllPreviewRequests = useCallback(() => {
    previewControllersRef.current.forEach(controller => {
      controller.abort();
    });
    previewControllersRef.current.clear();
    previewLoadingIdsRef.current.clear();
  }, []);

  const resetPreviewQueue = useCallback(() => {
    previewQueueVersionRef.current += 1;
    abortAllPreviewRequests();
  }, [abortAllPreviewRequests]);

  const createPreviewUrlWithTimeout = useCallback(
    async (fileId: number): Promise<string> => {
      const controller = new AbortController();
      previewControllersRef.current.set(fileId, controller);
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, PREVIEW_REQUEST_TIMEOUT_MS);
      let timeoutRejectId = 0;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRejectId = window.setTimeout(() => {
          reject(
            new Error(
              `Preview request timed out after ${PREVIEW_REQUEST_TIMEOUT_MS}ms`
            )
          );
        }, PREVIEW_REQUEST_TIMEOUT_MS);
      });

      try {
        const blob = (await Promise.race([
          downloadImageFile(fileId, { signal: controller.signal }),
          timeoutPromise,
        ])) as Blob;
        return URL.createObjectURL(blob);
      } finally {
        window.clearTimeout(timeoutId);
        window.clearTimeout(timeoutRejectId);
        if (previewControllersRef.current.get(fileId) === controller) {
          previewControllersRef.current.delete(fileId);
        }
      }
    },
    []
  );

  const loadPreviewWithRetry = useCallback(
    async (fileId: number, queueVersion: number): Promise<string | null> => {
      for (let attempt = 1; attempt <= PREVIEW_RETRY_ATTEMPTS; attempt += 1) {
        if (previewQueueVersionRef.current !== queueVersion) return null;

        try {
          return await createPreviewUrlWithTimeout(fileId);
        } catch (error) {
          if (previewQueueVersionRef.current !== queueVersion) return null;

          const isLastAttempt = attempt === PREVIEW_RETRY_ATTEMPTS;
          console.warn(
            `Preview load attempt ${attempt}/${PREVIEW_RETRY_ATTEMPTS} failed for file ${fileId}:`,
            error
          );

          if (isLastAttempt) return null;

          await delay(PREVIEW_RETRY_DELAY_MS);
        }
      }

      return null;
    },
    [createPreviewUrlWithTimeout]
  );

  const handlePreviewError = useCallback((fileId: number) => {
    setImageUrls(previousUrls => {
      const existingUrl = previousUrls[fileId];
      if (existingUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(existingUrl);
      }

      const nextUrls = { ...previousUrls };
      delete nextUrls[fileId];
      return nextUrls;
    });
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
      Object.values(imageUrlsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
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
        } else if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
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
      return nextStates;
    });

    if (imageFiles.length === 0) {
      previewQueueVersionRef.current += 1;
      return;
    }

    const queueVersion = ++previewQueueVersionRef.current;
    const pendingFiles = imageFiles.filter(
      file =>
        !imageUrlsRef.current[file.id] &&
        !previewLoadingIdsRef.current.has(file.id) &&
        previewStatesRef.current[file.id] !== 'fallback'
    );

    if (pendingFiles.length === 0) return;

    let nextIndex = 0;

    const loadNextPreview = async () => {
      while (nextIndex < pendingFiles.length) {
        const file = pendingFiles[nextIndex++];
        previewLoadingIdsRef.current.add(file.id);

        try {
          const previewUrl = await loadPreviewWithRetry(
            file.id,
            queueVersion
          );

          if (!previewUrl) {
            if (previewQueueVersionRef.current === queueVersion) {
              setPreviewStates(previousStates => ({
                ...previousStates,
                [file.id]: 'fallback',
              }));
            }
            continue;
          }

          if (previewQueueVersionRef.current !== queueVersion) {
            if (previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl);
            }
            continue;
          }

          setImageUrls(previousUrls => {
            if (previousUrls[file.id]) {
              if (previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
              }
              return previousUrls;
            }

            return {
              ...previousUrls,
              [file.id]: previewUrl,
            };
          });
          setPreviewStates(previousStates => {
            if (!previousStates[file.id]) return previousStates;
            const nextStates = { ...previousStates };
            delete nextStates[file.id];
            return nextStates;
          });
        } catch (previewError) {
          console.error(`Failed to load preview for file ${file.id}:`, previewError);
          if (previewQueueVersionRef.current === queueVersion) {
            setPreviewStates(previousStates => ({
              ...previousStates,
              [file.id]: 'fallback',
            }));
          }
        } finally {
          previewLoadingIdsRef.current.delete(file.id);
        }
      }
    };

    Array.from(
      { length: Math.min(MAX_CONCURRENT_PREVIEW_LOADS, pendingFiles.length) },
      () => loadNextPreview()
    );
  }, [abortAllPreviewRequests, imageFiles, loadPreviewWithRetry]);

  return {
    imageUrls,
    previewStates,
    resetPreviewQueue,
    handlePreviewError,
  };
}
