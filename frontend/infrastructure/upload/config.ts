export const DEFAULT_IMAGE_UPLOAD_FILE_CONCURRENCY = 2;
export const DEFAULT_IMAGE_UPLOAD_PART_CONCURRENCY = 3;

export function parseImageUploadConcurrency(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export const IMAGE_UPLOAD_FILE_CONCURRENCY = parseImageUploadConcurrency(
  process.env.NEXT_PUBLIC_IMAGE_UPLOAD_FILE_CONCURRENCY,
  DEFAULT_IMAGE_UPLOAD_FILE_CONCURRENCY
);

export const IMAGE_UPLOAD_PART_CONCURRENCY = parseImageUploadConcurrency(
  process.env.NEXT_PUBLIC_IMAGE_UPLOAD_PART_CONCURRENCY,
  DEFAULT_IMAGE_UPLOAD_PART_CONCURRENCY
);
