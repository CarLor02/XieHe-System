import type { UploadQueueStatus } from '@xiehe/upload-core';
import type { MobileUploadFile } from './upload';

export interface UploadTeam {
  id: number;
  name: string;
}

export interface ImageUploadEntry {
  id: string;
  originalFile: MobileUploadFile;
  // 重新裁剪从未裁剪源开始，连续调整不会不可逆地丢失图像范围。
  cropSourceFile: MobileUploadFile;
  file: MobileUploadFile;
  flipped: boolean;
  cropped: boolean;
  examType: string;
  teams: UploadTeam[];
  status: UploadQueueStatus;
  progress: number;
  error: string;
  imageId?: number;
}

export function canEditImagePixels(file: MobileUploadFile) {
  return file.mimeType === 'image/png' || file.mimeType === 'image/jpeg';
}
