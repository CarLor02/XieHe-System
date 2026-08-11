import { canUseUploaderView, normalizeTeamForm } from '@xiehe/access-core';
import { validateLoginForm } from '@xiehe/auth-core';
import {
  buildDashboardPendingTasks,
  paginateDashboardTasks,
} from '@xiehe/dashboard-core';
import { getPatientSearchDisplay } from '@xiehe/patient-core';
import { enqueueUploadOptions, summarizeUploadQueue } from '@xiehe/upload-core';
import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';
import { getToolsForExamType } from '@xiehe/imaging-catalog/tools';
import {
  BasicMode,
  IDLE_ANNOTATION_INTERACTION,
  createImageAccessUrlCache,
  createStoredZip,
  getEffectiveToolTab,
  prepareStudyEditorState,
  reduceAnnotationEditor,
  runBatchExport,
  transitionAnnotationInteraction,
} from '@xiehe/imaging-core';

export const sharedBusinessCapabilities = {
  access: { canUseUploaderView, normalizeTeamForm },
  auth: { validateLoginForm },
  dashboard: { buildDashboardPendingTasks, paginateDashboardTasks },
  patient: { getPatientSearchDisplay },
  imaging: {
    BasicMode,
    IDLE_ANNOTATION_INTERACTION,
    createImageAccessUrlCache,
    createStoredZip,
    getAnnotationConfig,
    getEffectiveToolTab,
    getToolsForExamType,
    prepareStudyEditorState,
    reduceAnnotationEditor,
    runBatchExport,
    transitionAnnotationInteraction,
  },
  upload: { enqueueUploadOptions, summarizeUploadQueue },
} as const;

export const SHARED_BUSINESS_CONTEXT_COUNT = Object.keys(
  sharedBusinessCapabilities
).length;
