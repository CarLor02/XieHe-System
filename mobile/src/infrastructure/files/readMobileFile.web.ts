import type { MobileUploadFile } from '@/features/imaging/domain/upload';
import {
  mimeTypeForFilename,
  validateUploadFile,
} from '@/features/imaging/domain/upload';

export function readMobileFile(asset: {
  name: string;
  uri: string;
  size?: number;
  file?: File;
}): MobileUploadFile {
  if (!asset.file)
    throw new Error('浏览器未返回可读取的文件，请使用文件选择器');
  const browserFile = asset.file;
  const release = () => {
    if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri);
  };
  const file: MobileUploadFile = {
    name: asset.name,
    uri: asset.uri,
    size: browserFile.size,
    mimeType: mimeTypeForFilename(asset.name),
    readChunk: (start, end) => browserFile.slice(start, end).arrayBuffer(),
    release,
  };
  try {
    validateUploadFile(file);
  } catch (cause) {
    release();
    throw cause;
  }
  return file;
}
