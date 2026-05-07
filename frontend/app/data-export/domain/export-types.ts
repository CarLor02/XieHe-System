import type { MeasurementData, VertebraAnnotation } from '@/app/imaging/viewer/public';

export type ExportContentType =
  | 'original-image'
  | 'annotated-image'
  | 'annotation-points'
  | 'measurement-parameters'
  | 'training-data';

export type TabularExportFormat = 'csv' | 'json' | 'excel';
export type AnnotatedImageExportFormat = 'png' | 'jpeg';
export type ExportFormat = TabularExportFormat | AnnotatedImageExportFormat | 'original';

export interface ExportFile {
  filename: string;
  blob: Blob;
}

export interface ParsedAnnotationData {
  measurements: MeasurementData[];
  imageWidth?: number;
  imageHeight?: number;
  vertebraeLayer?: VertebraAnnotation[];
}
