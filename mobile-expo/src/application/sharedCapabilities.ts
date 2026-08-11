import { canUseUploaderView } from '@xiehe/access-core';
import { validateLoginForm } from '@xiehe/auth-core';
import { paginateDashboardTasks } from '@xiehe/dashboard-core';
import { getPatientSearchDisplay } from '@xiehe/patient-core';
import { summarizeUploadQueue } from '@xiehe/upload-core';

export const sharedBusinessCapabilities = {
  access: { canUseUploaderView },
  auth: { validateLoginForm },
  dashboard: { paginateDashboardTasks },
  patient: { getPatientSearchDisplay },
  upload: { summarizeUploadQueue },
} as const;

export const SHARED_BUSINESS_CONTEXT_COUNT = Object.keys(
  sharedBusinessCapabilities
).length;
