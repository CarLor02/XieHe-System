import type { HttpClient } from '@xiehe/api-client';
import type { DICOMImageInfo, DICOMStudy } from '@xiehe/api-contracts';

export function createDicomClient(client: HttpClient) {
  return {
    getStudy: (studyId: string) =>
      client.get<DICOMStudy>(`/api/v1/images/studies/${studyId}`),
    getImageInfo: (imageId: string) =>
      client.get<DICOMImageInfo>(`/api/v1/images/${imageId}/info`),
  };
}
