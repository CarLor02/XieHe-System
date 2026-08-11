import type {
  BatchImportAiStatus,
  BatchImportUploadStatus,
} from '@xiehe/imaging-core/batch-import';

export type {
  BatchImportAiStatus,
  BatchImportUploadStatus,
} from '@xiehe/imaging-core/batch-import';

export type BatchImportOwnershipScope = 'personal' | 'team';

export interface BatchImportFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  uploadStatus: BatchImportUploadStatus;
  aiStatus: BatchImportAiStatus;
  imageFileId?: number;
  error?: string | null;
}

export type BatchImportTab = 'new-import' | 'import-tasks';
