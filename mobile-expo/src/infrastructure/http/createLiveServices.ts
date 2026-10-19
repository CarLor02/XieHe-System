import { createAxiosHttpClient } from '@xiehe/api-client/axios';
import type { MobileServices } from '../../application/services';
import { uploadImage } from '../../features/imaging/usecases/uploadImage';
import type { ExpoApiInfrastructure } from './createExpoApiInfrastructure';

export function createLiveServices(api: ExpoApiInfrastructure): MobileServices {
  const sdk = api.apiSdk;
  const storage = createAxiosHttpClient({
    defaultAuth: 'none',
    defaultResponseMode: 'raw',
  });
  return {
    patients: sdk.patients,
    imaging: sdk.imaging,
    dashboard: sdk.dashboard,
    teams: sdk.teams,
    reports: sdk.reports,
    async preview(id) {
      const image = await sdk.imaging.get(id);
      if (image.file_type === 'PNG' || image.file_type === 'JPEG') {
        const result = await sdk.imaging.getDownloadUrl(id);
        return { uri: result.url, isThumbnail: false };
      }
      const response = await sdk.imaging.getDownloadUrls([id], {
        variant: 'thumbnail',
      });
      const item = response.items[id];
      if (!item)
        throw new Error(response.errors[id]?.message ?? '暂无可显示的预览图');
      return { uri: item.url, isThumbnail: true };
    },
    upload: (file, patientId, examType, teamIds, onProgress) =>
      uploadImage({
        sdk,
        storage,
        file,
        patientId,
        examType,
        teamIds,
        onProgress,
      }),
  };
}
