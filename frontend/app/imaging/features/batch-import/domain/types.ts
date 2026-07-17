export type BatchImportUploadStatus =
  | 'pending'
  | 'preparing'
  | 'uploading'
  | 'uploaded'
  | 'error';

export type BatchImportAiStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed';

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
