import type {
  CfhAnnotation,
  MeasurementData,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/public';

export type {
  AnnotatedImageExportFormat,
  ExportContentType,
  ExportFormat,
  TabularExportFormat,
} from '@xiehe/imaging-core/exports';

export interface ExportFile {
  filename: string;
  blob: Blob;
}

export interface ParsedAnnotationData {
  measurements: MeasurementData[];
  imageWidth?: number;
  imageHeight?: number;
  vertebraeLayer?: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
}
