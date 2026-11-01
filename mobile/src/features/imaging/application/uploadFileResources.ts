import type { ImageUploadEntry } from '@/features/imaging/domain/uploadEntry';

export function releaseUnusedUploadFiles(
  previous: readonly ImageUploadEntry[],
  next: readonly ImageUploadEntry[]
) {
  const files = (entries: readonly ImageUploadEntry[]) =>
    entries.flatMap(entry => [
      entry.originalFile,
      entry.cropSourceFile,
      entry.file,
    ]);
  const retained = new Set(files(next).map(file => file.uri));
  const released = new Set<string>();
  for (const file of files(previous)) {
    if (!retained.has(file.uri) && !released.has(file.uri)) {
      file.release?.();
      released.add(file.uri);
    }
  }
}
