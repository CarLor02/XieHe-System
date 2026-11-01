import { File, FileMode, Paths } from 'expo-file-system';
import type { MobileUploadFile } from '@/features/imaging/domain/upload';
import {
  mimeTypeForFilename,
  validateUploadFile,
} from '@/features/imaging/domain/upload';

export function readMobileFile(asset: {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
  file?: unknown;
}): MobileUploadFile {
  const nativeFile = new File(asset.uri);
  const file: MobileUploadFile = {
    name: asset.name,
    uri: asset.uri,
    size: asset.size ?? nativeFile.size,
    mimeType: mimeTypeForFilename(asset.name),
    release: nativeFile.uri.startsWith(Paths.cache.uri)
      ? () => {
          try {
            if (nativeFile.exists) nativeFile.delete();
          } catch {
            /* 缓存可能已被系统回收。 */
          }
        }
      : undefined,
    async readChunk(start, end) {
      // Read only the current part, so a large image does not occupy memory once per part.
      const handle = nativeFile.open(FileMode.ReadOnly);
      try {
        handle.offset = start;
        return handle.readBytes(end - start).buffer;
      } finally {
        handle.close();
      }
    },
  };
  validateUploadFile(file);
  return file;
}
