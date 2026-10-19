import type { HttpApi } from '@stellarmesh/sdk';
import { createHttpClientAdapter } from '@xiehe/api-client/stellarmesh';
import { createAuthClient } from './clients/auth-client';
import { createDicomClient } from './clients/dicom-client';
import { createImagingClient } from './clients/imaging-client';
import { createOperationsClient } from './clients/operations-client';
import { createPatientClient } from './clients/patient-client';
import { createReportClient } from './clients/report-client';
import { createTeamClient } from './clients/team-client';
import { createUploadClient } from './clients/upload-client';

export interface XieheApiSdkOptions {
  http: HttpApi;
}

export function createXieheApiSdk(options: XieheApiSdkOptions) {
  const apiClient = createHttpClientAdapter(options.http);
  const operations = createOperationsClient(options.http);
  return {
    auth: createAuthClient(options.http, apiClient),
    patients: createPatientClient(options.http),
    teams: createTeamClient(options.http),
    imaging: createImagingClient(options.http, apiClient),
    upload: createUploadClient(apiClient),
    dashboard: operations.dashboard,
    models: operations.models,
    system: operations.system,
    reports: createReportClient(options.http),
    dicom: createDicomClient(apiClient),
  };
}

export type XieheApiSdk = ReturnType<typeof createXieheApiSdk>;
