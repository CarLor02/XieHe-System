/** Native preview and editing currently support only the raster formats used by the Web viewer. */
export function isSupportedImage(fileType: string): boolean {
  return ['PNG', 'JPEG', 'TIFF'].includes(fileType.toUpperCase());
}

export function requireSupportedImage(fileType: string): void {
  if (!isSupportedImage(fileType))
    throw new Error('移动端目前仅支持 PNG、JPEG 和 TIFF 影像');
}
