import type { ImageFile } from '@/services/imageServices/imageFileService';

import type {
  AnnotatedImageExportFormat,
  ExportContentType,
  ExportFormat,
  TabularExportFormat,
} from './export-types';

const TABULAR_EXPORT_EXTENSIONS: Record<TabularExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  excel: 'xls',
};

const IMAGE_EXPORT_EXTENSIONS: Record<AnnotatedImageExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
};

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

function getOriginalFilename(image: ImageFile): string {
  return sanitizeFilename(image.original_filename || `image_${image.id}`);
}

function getFilenameBase(image: ImageFile): string {
  const filename = getOriginalFilename(image);
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

function getFilenameExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(dotIndex + 1).toLowerCase() : '';
}

function getExtensionFromMimeType(mimeType?: string): string {
  if (!mimeType) return '';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('tiff')) return 'tiff';
  if (mimeType.includes('dicom')) return 'dcm';
  return '';
}

function getOriginalExportFilename(image: ImageFile): string {
  const filename = getOriginalFilename(image);
  if (getFilenameExtension(filename)) {
    return filename;
  }

  const extension = getExtensionFromMimeType(image.mime_type);
  return extension ? `${filename}.${extension}` : filename;
}

export function buildExportFilename(
  image: ImageFile,
  exportContent: ExportContentType,
  format: ExportFormat
): string {
  const base = getFilenameBase(image);

  if (exportContent === 'original-image' || exportContent === 'annotated-image') {
    return `${base}.${IMAGE_EXPORT_EXTENSIONS[format as AnnotatedImageExportFormat]}`;
  }

  // training-data：图像文件名与原图相同，label 文件另行构建
  if (exportContent === 'training-data') {
    return `${base}.png`;
  }

  return `${base}.${TABULAR_EXPORT_EXTENSIONS[format as TabularExportFormat]}`;
}

/** 训练数据 label 文件名（归一化坐标 JSON） */
export function buildTrainingLabelFilename(image: ImageFile): string {
  return `${getFilenameBase(image)}_label.json`;
}
