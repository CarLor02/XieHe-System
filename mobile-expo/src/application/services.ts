import type { TeamsGateway } from '../features/teams';
import type { XieheApiSdk } from '@xiehe/api-sdk';
import type { MobileUploadFile } from '../features/imaging/domain/upload';
import type { ImageEditorGateway } from '../features/image-editor';

export interface ImagePreview {
  uri: string | null;
  isThumbnail: boolean;
}

// Keep the mobile port limited to supported flows; DTOs and endpoints remain in the shared SDK.
export interface MobileServices {
  imageEditor: ImageEditorGateway;
  patients: Pick<XieheApiSdk['patients'], 'list' | 'get' | 'create' | 'update'>;
  imaging: Pick<
    XieheApiSdk['imaging'],
    | 'list'
    | 'get'
    | 'listPatientImages'
    | 'listAssignableTeams'
    | 'predict'
    | 'getDownloadUrl'
    | 'getDownloadUrls'
    | 'delete'
  >;
  dashboard: Pick<XieheApiSdk['dashboard'], 'getStats' | 'getRecentActivities'>;
  teams: TeamsGateway;
  reports: Pick<XieheApiSdk['reports'], 'list' | 'generate'>;
  preview: (imageId: number) => Promise<ImagePreview>;
  upload: (
    file: MobileUploadFile,
    patientId: number | null,
    examType: string,
    teamIds: number[],
    onProgress: (progress: number) => void
  ) => Promise<number>;
}
