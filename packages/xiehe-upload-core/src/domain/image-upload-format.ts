/** 新上传统一使用可直接预览、裁剪的栅格格式；不影响历史影像读取。 */
export function isSupportedImageUploadFilename(filename: string): boolean {
  return /\.(jpe?g|png)$/i.test(filename);
}
