import type { HttpClient } from '@xiehe/api-client';
import { createAuthClient } from './clients/auth-client';
import { createDicomClient } from './clients/dicom-client';
import { createImagingClient } from './clients/imaging-client';
import { createOperationsClient } from './clients/operations-client';
import { createPatientClient } from './clients/patient-client';
import { createReportClient } from './clients/report-client';
import { createTeamClient } from './clients/team-client';
import { createUploadClient } from './clients/upload-client';

export interface XieheApiSdkOptions {
  apiClient: HttpClient;
  publicApiClient?: HttpClient;
}

export function createXieheApiSdk(options: XieheApiSdkOptions) {
  const publicClient = options.publicApiClient ?? options.apiClient;
  const operations = createOperationsClient(options.apiClient);
  return {
    auth: createAuthClient(options.apiClient, publicClient),
    patients: createPatientClient(options.apiClient),
    teams: createTeamClient(options.apiClient),
    imaging: createImagingClient(options.apiClient),
    upload: createUploadClient(options.apiClient),
    dashboard: operations.dashboard,
    models: operations.models,
    system: operations.system,
    reports: createReportClient(options.apiClient),
    dicom: createDicomClient(options.apiClient),
  };
}

export type XieheApiSdk = ReturnType<typeof createXieheApiSdk>;
