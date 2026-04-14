export interface DICOMMetadata {
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

export interface DICOMInstance {
  instanceId: string;
  instanceNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  metadata: DICOMMetadata;
}

export interface DICOMSeries {
  seriesId: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  instanceCount: number;
  instances: DICOMInstance[];
}

export interface DICOMStudy {
  studyId: string;
  studyDate: string;
  studyDescription: string;
  patientName: string;
  patientId: string;
  series: DICOMSeries[];
}

export interface DICOMImageInfo {
  is_dicom?: boolean;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}
