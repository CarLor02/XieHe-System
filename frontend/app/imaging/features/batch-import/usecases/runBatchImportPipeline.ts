import {
  runBatchImportPipeline as runSharedBatchImportPipeline,
  type BatchImportFailureCode,
  type BatchImportPipelineEvent,
} from '@xiehe/imaging-core/batch-import';

import {
  completeImageImportItem,
  createImageImportBatch,
  createImageImportSessions,
  markImageImportUploadFailed,
  uploadObjectPart,
} from '@/services/imageServices';
import { maybeFlipImageFile } from '../domain/imageTransform';
import type { BatchImportFileItem } from '../domain/types';

interface PipelineInput {
  files: Array<BatchImportFileItem & { file: File }>;
  patientId: number;
  description: string;
  teamIds: number[];
  flip: boolean;
  sessionWindowSize: number;
  onFilePatch: (fileId: string, patch: Partial<BatchImportFileItem>) => void;
  onMessage: (message: string) => void;
}

const EVENT_MESSAGES: Record<BatchImportPipelineEvent, string> = {
  'preparing-files': '正在准备影像...',
  'creating-batch': '正在创建批量导入任务...',
  'creating-upload-sessions': '正在创建上传会话...',
  'upload-complete': '上传已完成，AI任务正在后台处理',
};

const FAILURE_MESSAGES: Record<BatchImportFailureCode, string> = {
  'prepare-file-failed': '影像处理失败',
  'no-ready-files': '没有可上传的影像文件',
  'create-sessions-failed': '创建上传会话失败',
  'upload-file-failed': '上传失败',
};

export function runBatchImportPipeline(input: PipelineInput): Promise<string> {
  return runSharedBatchImportPipeline<File>({
    files: input.files.map(item => ({ id: item.id, source: item.file })),
    patientId: input.patientId,
    description: input.description,
    teamIds: input.teamIds,
    flip: input.flip,
    sessionWindowSize: input.sessionWindowSize,
    onFilePatch: input.onFilePatch,
    onEvent: event => input.onMessage(EVENT_MESSAGES[event]),
    ports: {
      prepareFile: async (file, flip) => {
        const prepared = await maybeFlipImageFile(file, flip);
        return {
          source: prepared,
          filename: prepared.name,
          size: prepared.size,
          mimeType: prepared.type || 'application/octet-stream',
        };
      },
      createBatch: async request => {
        const batch = await createImageImportBatch({
          patient_id: request.patientId,
          description: request.description,
          team_ids: request.teamIds,
          files: request.files.map(file => ({
            client_file_id: file.clientFileId,
            filename: file.filename,
            size: file.size,
            mime_type: file.mimeType,
          })),
        });
        return {
          batchId: batch.batch_id,
          items: batch.items,
        };
      },
      createSessions: async (batchId, itemIds) =>
        (await createImageImportSessions(batchId, itemIds)).items,
      uploadPart: ({ url, source, start, end }) =>
        uploadObjectPart(url, source.slice(start, end)),
      completeItem: request =>
        completeImageImportItem(request.batchId, request.itemId, {
          upload_id: request.uploadId,
          parts: request.parts,
        }),
      markUploadFailed: async (batchId, itemId, error) => {
        await markImageImportUploadFailed(batchId, itemId, error);
      },
      getErrorMessage: (error, fallback) =>
        error instanceof Error ? error.message : FAILURE_MESSAGES[fallback],
    },
  });
}
