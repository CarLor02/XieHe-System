import { apiClient } from '@/infrastructure/http';
import { DICOMImageInfo, DICOMStudy } from './types';

export async function getDicomStudy(studyId: string): Promise<DICOMStudy> {
  return apiClient.get<DICOMStudy>(`/api/v1/images/studies/${studyId}`);
}

export async function getDicomImageInfo(
  imageId: string
): Promise<DICOMImageInfo> {
  return apiClient.get<DICOMImageInfo>(`/api/v1/images/${imageId}/info`);
}
