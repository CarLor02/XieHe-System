import { maybeFlipImageFile } from '../domain/imageTransform';
import type { BatchImportFileItem } from '../domain/types';
import { patchFromServerItem } from '../domain/status';
import {
  completeImageImportItem,
  createImageImportBatch,
  createImageImportSessions,
  markImageImportUploadFailed,
  uploadObjectPart,
} from '@/services/imageServices';

const UPLOAD_CONCURRENCY = 3;

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

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await worker(item);
      }
    }
  );
  await Promise.all(runners);
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function runBatchImportPipeline(input: PipelineInput): Promise<string> {
  const prepared = new Map<string, File>();
  input.onMessage('正在准备影像...');
  for (const item of input.files) {
    input.onFilePatch(item.id, { uploadStatus: 'preparing', error: null });
    try {
      prepared.set(item.id, await maybeFlipImageFile(item.file, input.flip));
    } catch (error) {
      input.onFilePatch(item.id, {
        uploadStatus: 'error',
        aiStatus: 'failed',
        error: error instanceof Error ? error.message : '影像处理失败',
      });
    }
  }

  const readyFiles = input.files.filter(item => prepared.has(item.id));
  if (readyFiles.length === 0) {
    throw new Error('没有可上传的影像文件');
  }

  input.onMessage('正在创建批量导入任务...');
  const batch = await createImageImportBatch({
    patient_id: input.patientId,
    description: input.description,
    team_ids: input.teamIds,
    files: readyFiles.map(item => {
      const file = prepared.get(item.id) ?? item.file;
      return {
        client_file_id: item.id,
        filename: file.name,
        size: file.size,
        mime_type: file.type || item.type || 'application/octet-stream',
      };
    }),
  });
  const fileByClientId = new Map(readyFiles.map(item => [item.id, item]));

  for (const itemWindow of chunks(
    batch.items,
    Math.max(1, input.sessionWindowSize)
  )) {
    input.onMessage('正在创建上传会话...');
    let sessions: Awaited<ReturnType<typeof createImageImportSessions>>;
    try {
      sessions = await createImageImportSessions(
        batch.batch_id,
        itemWindow.map(item => item.id)
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '创建上传会话失败';
      await Promise.all(
        itemWindow.map(async item => {
          try {
            await markImageImportUploadFailed(batch.batch_id, item.id, message);
          } catch {
            // Preserve the local state when the backend is temporarily unavailable.
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
      sessions.items,
      UPLOAD_CONCURRENCY,
      async session => {
        const localItem = fileByClientId.get(session.client_file_id);
        const file = prepared.get(session.client_file_id);
        if (!localItem || !file) return;

        input.onFilePatch(localItem.id, {
          uploadStatus: 'uploading',
          imageFileId: session.image_file_id,
          error: null,
        });
        try {
          const parts = [];
          for (const part of session.parts) {
            const start = (part.part_number - 1) * session.part_size;
            const end = Math.min(start + session.part_size, file.size);
            const etag = await uploadObjectPart(
              part.url,
              file.slice(start, end)
            );
            parts.push({ part_number: part.part_number, etag });
          }
          const serverItem = await completeImageImportItem(
            batch.batch_id,
            session.item_id,
            {
              upload_id: session.upload_id,
              parts,
            }
          );
          input.onFilePatch(localItem.id, patchFromServerItem(serverItem));
        } catch (error) {
          const message = error instanceof Error ? error.message : '上传失败';
          try {
            await markImageImportUploadFailed(
              batch.batch_id,
              session.item_id,
              message
            );
          } catch {
            // The local failure remains visible even if status persistence fails.
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

  input.onMessage('上传已完成，AI任务正在后台处理');
  return batch.batch_id;
}
