import { runWithConcurrency } from './concurrency';

export interface MultipartUploadPart {
  partNumber: number;
  size: number;
}

export interface CompletedMultipartUploadPart {
  partNumber: number;
  etag: string;
}

export interface MultipartUploadProgress {
  loadedBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface MultipartUploadPartContext {
  signal: AbortSignal;
  onProgress: (loadedBytes: number) => void;
}

export interface RunMultipartUploadInput<TPart extends MultipartUploadPart> {
  parts: readonly TPart[];
  totalBytes: number;
  concurrency: number;
  uploadPart: (
    part: TPart,
    context: MultipartUploadPartContext
  ) => Promise<string>;
  onProgress?: (progress: MultipartUploadProgress) => void;
}

/**
 * 平台无关的 multipart 编排。各平台只负责上传单个分片，进度聚合、排序和失败取消由此处统一处理。
 */
export async function runMultipartUpload<TPart extends MultipartUploadPart>(
  input: RunMultipartUploadInput<TPart>
): Promise<CompletedMultipartUploadPart[]> {
  const parts = [...input.parts].sort(
    (left, right) => left.partNumber - right.partNumber
  );
  if (new Set(parts.map(part => part.partNumber)).size !== parts.length) {
    throw new Error('Multipart part numbers must be unique');
  }

  const totalBytes = Math.max(0, Math.floor(input.totalBytes));
  const loadedByPart = new Map<number, number>();
  const completedByPart = new Map<number, string>();
  const controller = new AbortController();
  let aggregateLoaded = 0;
  let hasError = false;
  let firstError: unknown;

  const emitProgress = () => {
    input.onProgress?.({
      loadedBytes: aggregateLoaded,
      totalBytes,
      percentage:
        totalBytes === 0
          ? 100
          : Math.min(100, (aggregateLoaded / totalBytes) * 100),
    });
  };

  emitProgress();

  await runWithConcurrency(parts, input.concurrency, async part => {
    if (controller.signal.aborted) return;

    const partSize = Math.max(0, Math.floor(part.size));
    const reportPartProgress = (loadedBytes: number) => {
      if (hasError) return;
      const previous = loadedByPart.get(part.partNumber) ?? 0;
      const next = Math.max(
        previous,
        Math.min(partSize, Math.max(0, Math.floor(loadedBytes)))
      );
      if (next === previous) return;
      loadedByPart.set(part.partNumber, next);
      aggregateLoaded = Math.min(
        totalBytes,
        aggregateLoaded + (next - previous)
      );
      emitProgress();
    };

    try {
      const etag = await input.uploadPart(part, {
        signal: controller.signal,
        onProgress: reportPartProgress,
      });
      reportPartProgress(partSize);
      completedByPart.set(part.partNumber, etag);
    } catch (error) {
      if (!hasError) {
        hasError = true;
        firstError = error;
        controller.abort();
      }
    }
  });

  if (hasError) throw firstError;

  return parts.map(part => {
    const etag = completedByPart.get(part.partNumber);
    if (etag === undefined) {
      throw new Error(`Multipart part ${part.partNumber} did not complete`);
    }
    return { partNumber: part.partNumber, etag };
  });
}
