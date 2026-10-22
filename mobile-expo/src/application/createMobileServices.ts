import {
  createStellarmeshHttp,
  createHttpClientAdapter,
} from '@xiehe/api-client/stellarmesh';
import type { MobileServices } from './services';
import { uploadImage } from '../features/imaging/usecases/uploadImage';
import type { ExpoApiInfrastructure } from '../infrastructure/http/createExpoApiInfrastructure';
import { createImageEditorGateway } from '../infrastructure/http/createImageEditorGateway';
import { requireSupportedImage } from '../features/imaging/domain/supportedImage';

export function createMobileServices(
  api: ExpoApiInfrastructure
): MobileServices {
  const sdk = api.apiSdk;
  const storage = createHttpClientAdapter(createStellarmeshHttp({ raw: true }));
  return {
    imageEditor: createImageEditorGateway(sdk.imaging, sdk.reports),
    patients: sdk.patients,
    imaging: sdk.imaging,
    dashboard: sdk.dashboard,
    teams: sdk.teams,
    reports: sdk.reports,
    async preview(id) {
      const image = await sdk.imaging.get(id);
      requireSupportedImage(image.file_type);
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
        uploads: sdk.upload,
        storage,
        file,
        patientId,
        examType,
        teamIds,
        onProgress,
      }),
  };
}
