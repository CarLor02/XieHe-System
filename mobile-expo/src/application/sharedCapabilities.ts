import { canUseUploaderView, normalizeTeamForm } from '@xiehe/access-core';
import { validateLoginForm } from '@xiehe/auth-core';
import { paginateDashboardTasks } from '@xiehe/dashboard-core';
import { getPatientSearchDisplay } from '@xiehe/patient-core';
import { enqueueUploadOptions, summarizeUploadQueue } from '@xiehe/upload-core';
import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';
import {
  createImageAccessUrlCache,
  createStoredZip,
} from '@xiehe/imaging-core';

export const sharedBusinessCapabilities = {
  access: { canUseUploaderView, normalizeTeamForm },
  auth: { validateLoginForm },
  dashboard: { paginateDashboardTasks },
  patient: { getPatientSearchDisplay },
  imaging: { createImageAccessUrlCache, createStoredZip, getAnnotationConfig },
  upload: { enqueueUploadOptions, summarizeUploadQueue },
} as const;

export const SHARED_BUSINESS_CONTEXT_COUNT = Object.keys(
  sharedBusinessCapabilities
).length;
