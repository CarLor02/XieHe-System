import { chunkItems, runWithConcurrency } from './concurrency';
import {
  patchFromServerItem,
  type BatchImportServerItem,
  type BatchImportServerPatch,
} from '../domain/status';

export type BatchImportPipelineEvent =
  | 'preparing-files'
  | 'creating-batch'
  | 'creating-upload-sessions'
  | 'upload-complete';

export type BatchImportFailureCode =
  | 'prepare-file-failed'
  | 'no-ready-files'
  | 'create-sessions-failed'
  | 'upload-file-failed';

export interface BatchImportFile<TSource> {
  id: string;
  source: TSource;
}

export interface PreparedBatchImportFile<TSource> {
  source: TSource;
  filename: string;
  size: number;
  mimeType: string;
}

export interface BatchImportCreatedItem extends BatchImportServerItem {
  id: number;
  client_file_id: string;
}

export interface BatchImportUploadSession {
  item_id: number;
  client_file_id: string;
  image_file_id: number;
  upload_id: string;
  part_size: number;
  parts: Array<{ part_number: number; url: string }>;
}

export interface BatchImportPipelinePorts<TSource> {
  prepareFile(
    source: TSource,
    flip: boolean
  ): Promise<PreparedBatchImportFile<TSource>>;
  createBatch(input: {
    patientId: number;
    description: string;
    teamIds: number[];
    files: Array<{
      clientFileId: string;
      filename: string;
      size: number;
      mimeType: string;
    }>;
  }): Promise<{ batchId: string; items: BatchImportCreatedItem[] }>;
  createSessions(
    batchId: string,
    itemIds: number[]
  ): Promise<BatchImportUploadSession[]>;
  uploadPart(input: {
    url: string;
    source: TSource;
    start: number;
    end: number;
  }): Promise<string>;
  completeItem(input: {
    batchId: string;
    itemId: number;
    uploadId: string;
    parts: Array<{ part_number: number; etag: string }>;
  }): Promise<BatchImportServerItem>;
  markUploadFailed(
    batchId: string,
    itemId: number,
    error: string
  ): Promise<void>;
  getErrorMessage(error: unknown, fallback: BatchImportFailureCode): string;
}

export interface RunBatchImportPipelineInput<TSource> {
  files: BatchImportFile<TSource>[];
  patientId: number;
  description: string;
  teamIds: number[];
  flip: boolean;
  sessionWindowSize: number;
  uploadConcurrency?: number;
  ports: BatchImportPipelinePorts<TSource>;
  onFilePatch: (fileId: string, patch: BatchImportServerPatch) => void;
  onEvent: (event: BatchImportPipelineEvent) => void;
}

export class BatchImportPipelineError extends Error {
  constructor(
    readonly code: BatchImportFailureCode,
    message: string
  ) {
    super(message);
    this.name = 'BatchImportPipelineError';
  }
}

/** 跨端批量导入编排；文件切片和 API 调用均由平台端口提供。 */
export async function runBatchImportPipeline<TSource>(
  input: RunBatchImportPipelineInput<TSource>
): Promise<string> {
  const prepared = new Map<string, PreparedBatchImportFile<TSource>>();
  input.onEvent('preparing-files');

  for (const item of input.files) {
    input.onFilePatch(item.id, {
      uploadStatus: 'preparing',
      aiStatus: 'pending',
      error: null,
    });
    try {
      prepared.set(
        item.id,
        await input.ports.prepareFile(item.source, input.flip)
      );
    } catch (error) {
      input.onFilePatch(item.id, {
        uploadStatus: 'error',
        aiStatus: 'failed',
        error: input.ports.getErrorMessage(error, 'prepare-file-failed'),
      });
    }
  }

  const readyFiles = input.files.filter(item => prepared.has(item.id));
  if (readyFiles.length === 0) {
    throw new BatchImportPipelineError(
      'no-ready-files',
      input.ports.getErrorMessage(null, 'no-ready-files')
    );
  }

  input.onEvent('creating-batch');
  const batch = await input.ports.createBatch({
    patientId: input.patientId,
    description: input.description,
    teamIds: input.teamIds,
    files: readyFiles.map(item => {
      const file = prepared.get(item.id)!;
      return {
        clientFileId: item.id,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
      };
    }),
  });
  const fileByClientId = new Map(readyFiles.map(item => [item.id, item]));

  for (const itemWindow of chunkItems(
    batch.items,
    Math.max(1, input.sessionWindowSize)
  )) {
    input.onEvent('creating-upload-sessions');
    let sessions: BatchImportUploadSession[];
    try {
      sessions = await input.ports.createSessions(
        batch.batchId,
        itemWindow.map(item => item.id)
      );
    } catch (error) {
      const message = input.ports.getErrorMessage(
        error,
        'create-sessions-failed'
      );
      await Promise.all(
        itemWindow.map(async item => {
          try {
            await input.ports.markUploadFailed(batch.batchId, item.id, message);
          } catch {
            // 本地错误状态不依赖后端失败状态写回成功。
          }
          input.onFilePatch(item.client_file_id, {
            uploadStatus: 'error',
            aiStatus: 'failed',
            error: message,
          });
        })
      );
      continue;
    }

    await runWithConcurrency(
      sessions,
      input.uploadConcurrency ?? 3,
      async session => {
        const localItem = fileByClientId.get(session.client_file_id);
        const file = prepared.get(session.client_file_id);
        if (!localItem || !file) return;

        input.onFilePatch(localItem.id, {
          uploadStatus: 'uploading',
          aiStatus: 'pending',
          imageFileId: session.image_file_id,
          error: null,
        });
        try {
          const parts = [];
          for (const part of session.parts) {
            const start = (part.part_number - 1) * session.part_size;
            const end = Math.min(start + session.part_size, file.size);
            const etag = await input.ports.uploadPart({
              url: part.url,
              source: file.source,
              start,
              end,
            });
            parts.push({ part_number: part.part_number, etag });
          }
          const serverItem = await input.ports.completeItem({
            batchId: batch.batchId,
            itemId: session.item_id,
            uploadId: session.upload_id,
            parts,
          });
          input.onFilePatch(localItem.id, patchFromServerItem(serverItem));
        } catch (error) {
          const message = input.ports.getErrorMessage(
            error,
            'upload-file-failed'
          );
          try {
            await input.ports.markUploadFailed(
              batch.batchId,
              session.item_id,
              message
            );
          } catch {
            // 本地错误状态不依赖后端失败状态写回成功。
          }
          input.onFilePatch(localItem.id, {
            uploadStatus: 'error',
            aiStatus: 'failed',
            error: message,
          });
        }
      }
    );
  }

  input.onEvent('upload-complete');
  return batch.batchId;
}
