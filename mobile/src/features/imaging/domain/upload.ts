import { isSupportedImageUploadFilename } from '@xiehe/upload-core';

export const MAX_MOBILE_UPLOAD_BYTES = 100 * 1024 * 1024;
export interface MobileUploadFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
  readChunk: (start: number, end: number) => Promise<ArrayBuffer>;
  /** 仅清理缓存副本或对象 URL，不删除用户选择的原文件。 */
  release?: () => void;
}
export function validateUploadFile(
  file: Pick<MobileUploadFile, 'name' | 'size'>
) {
  if (!isSupportedImageUploadFilename(file.name))
    throw new Error('支持 JPG、PNG 文件');
  if (file.size <= 0) throw new Error('无法读取文件或文件为空，请重新选择');
  if (file.size > MAX_MOBILE_UPLOAD_BYTES)
    throw new Error('单个文件最大支持 100 MB');
}
export function mimeTypeForFilename(name: string): string {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  throw new Error('不支持的文件格式');
}
