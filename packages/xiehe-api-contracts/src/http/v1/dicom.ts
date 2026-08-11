export interface DicomMetadata {
  patientName: string;
  patientId: string;
  studyDate: string;
  studyDescription: string;
  seriesDescription: string;
  modality: string;
  rows: number;
  columns: number;
  pixelSpacing?: number[];
  sliceThickness?: number;
  sliceLocation?: number;
  windowCenter?: number;
  windowWidth?: number;
  manufacturer?: string;
  stationName?: string;
}

export interface DicomInstance {
  instanceId: string;
  instanceNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  metadata: DicomMetadata;
}

export interface DicomSeries {
  seriesId: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  instanceCount: number;
  instances: DicomInstance[];
}

export interface DicomStudy {
  studyId: string;
  studyDate: string;
  studyDescription: string;
  patientName: string;
  patientId: string;
  series: DicomSeries[];
}

export interface DicomImageInfo {
  is_dicom?: boolean;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}

// 兼容 Web 端既有公开命名。
export type DICOMMetadata = DicomMetadata;
export type DICOMInstance = DicomInstance;
export type DICOMSeries = DicomSeries;
export type DICOMStudy = DicomStudy;
export type DICOMImageInfo = DicomImageInfo;
