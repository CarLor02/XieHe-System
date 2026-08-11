import type { UploadQueueStatus } from '../domain/upload-queue';

export interface UploadOptionsQueueState {
  activeFileId: string | null;
  queuedFileIds: string[];
}

export interface UploadWorkflowEntry {
  id: string;
  status: UploadQueueStatus;
  examType?: string | null;
}

export type UploadStartValidationCode =
  'missing-patient' | 'no-pending-files' | 'missing-exam-type';

export function enqueueUploadOptions(
  state: UploadOptionsQueueState,
  fileIds: readonly string[]
): UploadOptionsQueueState {
  if (fileIds.length === 0) return state;
  if (state.activeFileId) {
    return {
      activeFileId: state.activeFileId,
      queuedFileIds: [...state.queuedFileIds, ...fileIds],
    };
  }
  return {
    activeFileId: fileIds[0],
    queuedFileIds: [...state.queuedFileIds, ...fileIds.slice(1)],
  };
}

export function advanceUploadOptions(
  state: UploadOptionsQueueState
): UploadOptionsQueueState {
  return {
    activeFileId: state.queuedFileIds[0] ?? null,
    queuedFileIds: state.queuedFileIds.slice(1),
  };
}

export function removeFromUploadOptions(
  state: UploadOptionsQueueState,
  fileId: string
): UploadOptionsQueueState {
  const queuedFileIds = state.queuedFileIds.filter(id => id !== fileId);
  if (state.activeFileId !== fileId) {
    return { activeFileId: state.activeFileId, queuedFileIds };
  }
  return advanceUploadOptions({ activeFileId: null, queuedFileIds });
}

export function validateUploadStart(
  patientId: string | number | null | undefined,
  files: readonly UploadWorkflowEntry[]
): UploadStartValidationCode | null {
  if (
    patientId === null ||
    patientId === undefined ||
    String(patientId) === ''
  ) {
    return 'missing-patient';
  }
  const pendingFiles = files.filter(file => file.status === 'pending');
  if (pendingFiles.length === 0) return 'no-pending-files';
  if (pendingFiles.some(file => !file.examType)) return 'missing-exam-type';
  return null;
}

export function markPendingUploadsStarted<T extends UploadWorkflowEntry>(
  files: readonly T[]
): T[] {
  return files.map(file =>
    file.status === 'pending' ? { ...file, status: 'uploading' as const } : file
  );
}
