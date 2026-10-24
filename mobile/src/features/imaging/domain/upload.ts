export const MAX_MOBILE_UPLOAD_BYTES = 100 * 1024 * 1024;
export interface MobileUploadFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
  readChunk: (start: number, end: number) => Promise<ArrayBuffer>;
}
export function validateUploadFile(
  file: Pick<MobileUploadFile, 'name' | 'size'>
) {
  if (!/\.(png|jpe?g|tiff?)$/i.test(file.name))
    throw new Error('支持 PNG、JPEG 和 TIFF 文件');
  if (file.size <= 0) throw new Error('无法读取文件或文件为空，请重新选择');
  if (file.size > MAX_MOBILE_UPLOAD_BYTES)
    throw new Error('首版支持单个文件最大 100 MB');
}
export function mimeTypeForFilename(name: string): string {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.tiff?$/i.test(name)) return 'image/tiff';
  throw new Error('不支持的文件格式');
}
