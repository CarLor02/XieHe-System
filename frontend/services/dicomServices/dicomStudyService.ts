import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DICOMImageInfo, DICOMStudy } from './types';

export async function getDicomStudy(studyId: string): Promise<DICOMStudy> {
  const response = await apiClient.get(`/api/v1/images/studies/${studyId}`);
  return extractData<DICOMStudy>(response);
}

export async function getDicomImageInfo(imageId: string): Promise<DICOMImageInfo> {
  const response = await apiClient.get(`/api/v1/images/${imageId}/info`);
  return extractData<DICOMImageInfo>(response);
}
