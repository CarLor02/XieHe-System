import { apiSdk } from '@/infrastructure/http';
import type { DICOMImageInfo, DICOMStudy } from './types';

export async function getDicomStudy(studyId: string): Promise<DICOMStudy> {
  return apiSdk.dicom.getStudy(studyId);
}

export async function getDicomImageInfo(
  imageId: string
): Promise<DICOMImageInfo> {
  return apiSdk.dicom.getImageInfo(imageId);
}
