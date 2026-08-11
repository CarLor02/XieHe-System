export interface ExportImageReference {
  id: number;
  original_filename?: string | null;
  patient_id?: number | null;
  patient_identifier?: string | null;
}

export type ExportContentType =
  | 'original-image'
  | 'annotated-image'
  | 'annotation-points'
  | 'measurement-parameters'
  | 'training-data'
  | 'labelme-compatible-data';
export type TabularExportFormat = 'csv' | 'json' | 'excel';
export type AnnotatedImageExportFormat = 'png' | 'jpeg';
export type ExportFormat =
  TabularExportFormat | AnnotatedImageExportFormat | 'original';

const TABULAR_EXTENSIONS: Record<TabularExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  excel: 'xls',
};
const IMAGE_EXTENSIONS: Record<AnnotatedImageExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
};

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

function getFilenameBase(image: ExportImageReference): string {
  const filename = sanitizeFilename(
    image.original_filename || `image_${image.id}`
  );
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

export function buildExportFilename(
  image: ExportImageReference,
  content: ExportContentType,
  format: ExportFormat
): string {
  const base = getFilenameBase(image);
  if (content === 'original-image' || content === 'annotated-image') {
    return `${base}.${IMAGE_EXTENSIONS[format as AnnotatedImageExportFormat]}`;
  }
  if (content === 'training-data') return `${base}.png`;
  return `${base}.${TABULAR_EXTENSIONS[format as TabularExportFormat]}`;
}

export function buildTrainingLabelFilename(image: ExportImageReference) {
  return `${getFilenameBase(image)}_label.json`;
}

export function buildLabelMeImageFilename(image: ExportImageReference) {
  return `${getFilenameBase(image)}.png`;
}

export function buildLabelMeJsonFilename(image: ExportImageReference) {
  return `${getFilenameBase(image)}.json`;
}

export function buildLabelMeExportPath(
  image: ExportImageReference,
  filename: string
) {
  const folder =
    sanitizeFilename(
      image.patient_identifier ||
        (image.patient_id ? `patient_${image.patient_id}` : `image_${image.id}`)
    ) || `image_${image.id}`;
  return `${folder}/${sanitizeFilename(filename)}`;
}
