import { ChangeEvent, useCallback, useState } from 'react';
import type {
  BatchImportFileItem,
  BatchImportOwnershipScope,
} from '@/app/imaging/features/batch-import/domain/types';
import { EXAM_TYPES } from '@/app/imaging/domain/imagingFilters';
import { maybeFlipImageFile } from '@/app/imaging/features/batch-import/domain/imageTransform';
import type {
  TeamMultiSelectLoadParams,
  TeamMultiSelectPage,
} from '@/components/common/TeamMultiSelect';
import {
  completeBatchImageUpload,
  createBatchImageUploadSessions,
  getBatchUploadStatus,
  uploadObjectPart,
  type BatchCompleteUploadItem,
  type BatchUploadSessionItem,
} from '@/services/imageServices';

const MAX_BATCH_FILES = 200;
const UPLOAD_CONCURRENCY = 3;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 180;

type PreparedFile = BatchImportFileItem & { file: File };

interface UseBatchImageImportOptions {
  reloadImages: () => Promise<void>;
  loadTeams: (params: TeamMultiSelectLoadParams) => Promise<TeamMultiSelectPage>;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function delay(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function toImportFile(file: File, index: number): PreparedFile {
  return {
    id: `batch-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    file,
    uploadStatus: 'pending',
    aiStatus: 'pending',
  };
}

export function useBatchImageImport({
  reloadImages,
  loadTeams,
}: UseBatchImageImportOptions) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [patientId, setPatientId] = useState('');
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0]);
  const [ownershipScope, setOwnershipScope] =
    useState<BatchImportOwnershipScope>('personal');
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [lrFlip, setLrFlip] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const patchFile = useCallback((fileId: string, patch: Partial<BatchImportFileItem>) => {
    setFiles(current =>
      current.map(file => (file.id === fileId ? { ...file, ...patch } : file))
    );
  }, []);

  const handleFileInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;
    if (selectedFiles.length > MAX_BATCH_FILES) {
      setMessage(`一次最多导入 ${MAX_BATCH_FILES} 张影像`);
      return;
    }
    setFiles(selectedFiles.map(toImportFile));
    setOverlayOpen(true);
    setMessage('');
  }, []);

  const closeOverlay = useCallback(() => {
    if (isUploading) return;
    setOverlayOpen(false);
    setFiles([]);
    setMessage('');
  }, [isUploading]);

  const prepareFiles = useCallback(async () => {
    const prepared = new Map<string, File>();

    for (const item of files) {
      patchFile(item.id, { uploadStatus: 'preparing', error: null });
      try {
        prepared.set(item.id, await maybeFlipImageFile(item.file, lrFlip));
      } catch (error) {
        patchFile(item.id, {
          uploadStatus: 'error',
          aiStatus: 'failed',
          error: error instanceof Error ? error.message : '影像处理失败',
        });
      }
    }

    return prepared;
  }, [files, lrFlip, patchFile]);

  const uploadSession = useCallback(
    async (
      session: BatchUploadSessionItem,
      preparedFiles: Map<string, File>
    ): Promise<BatchCompleteUploadItem | null> => {
      const file = preparedFiles.get(session.client_file_id);
      if (!file) return null;

      patchFile(session.client_file_id, {
        uploadStatus: 'uploading',
        imageFileId: session.image_file_id,
      });

      try {
        const parts = [];
        for (const part of session.parts) {
          const start = (part.part_number - 1) * session.part_size;
          const end = Math.min(start + session.part_size, file.size);
          const etag = await uploadObjectPart(part.url, file.slice(start, end));
          parts.push({ part_number: part.part_number, etag });
        }
        return {
          client_file_id: session.client_file_id,
          image_file_id: session.image_file_id,
          upload_id: session.upload_id,
          parts,
        };
      } catch (error) {
        patchFile(session.client_file_id, {
          uploadStatus: 'error',
          aiStatus: 'failed',
          error: error instanceof Error ? error.message : '上传失败',
        });
        return null;
      }
    },
    [patchFile]
  );

  const pollAiStatus = useCallback(
    async (imageFileIds: number[]) => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        const result = await getBatchUploadStatus(imageFileIds);
        const statusByImageId = new Map(
          result.items.map(item => [item.image_file_id, item])
        );
        setFiles(current =>
          current.map(file => {
            if (!file.imageFileId) return file;
            const status = statusByImageId.get(file.imageFileId);
            if (!status) return file;
            return {
              ...file,
              uploadStatus:
                status.status === 'FAILED' ? 'error' : file.uploadStatus,
              aiStatus: status.ai_status,
              error: status.error ?? file.error,
            };
          })
        );

        if (result.items.every(item => item.ai_status === 'succeeded' || item.ai_status === 'failed')) {
          await reloadImages();
          return true;
        }
        await delay(POLL_INTERVAL_MS);
      }
      await reloadImages();
      return false;
    },
    [reloadImages]
  );

  const startImport = useCallback(async () => {
    if (!patientId) {
      setMessage('请选择患者');
      return;
    }
    if (ownershipScope === 'team' && teamIds.length === 0) {
      setMessage('请选择至少一个归属团队');
      return;
    }
    if (files.length === 0) {
      setMessage('请选择需要导入的影像文件');
      return;
    }

    setIsUploading(true);
    setMessage('正在准备影像...');

    try {
      const preparedFiles = await prepareFiles();
      const readyFiles = files.filter(file => preparedFiles.has(file.id));
      if (readyFiles.length === 0) {
        setMessage('没有可上传的影像文件');
        return;
      }

      setMessage('正在创建上传会话...');
      const sessions = await createBatchImageUploadSessions({
        patient_id: Number(patientId),
        description: examType,
        team_ids: ownershipScope === 'team' ? teamIds : [],
        files: readyFiles.map(file => {
          const prepared = preparedFiles.get(file.id) || file.file;
          return {
            client_file_id: file.id,
            filename: prepared.name,
            size: prepared.size,
            mime_type: prepared.type || file.type || 'application/octet-stream',
          };
        }),
      });

      const completedItems: BatchCompleteUploadItem[] = [];
      setMessage('正在上传影像...');
      await runWithConcurrency(sessions.items, UPLOAD_CONCURRENCY, async session => {
        const completed = await uploadSession(session, preparedFiles);
        if (completed) completedItems.push(completed);
      });

      if (completedItems.length === 0) {
        setMessage('影像上传失败');
        return;
      }

      setMessage('上传完成，正在启动AI检测...');
      const completeResult = await completeBatchImageUpload({ items: completedItems });
      const resultByClientId = new Map(
        completeResult.items.map(item => [item.client_file_id, item])
      );
      const imageIds = completeResult.items
        .filter(item => !item.error)
        .map(item => item.image_file_id);
      setFiles(current =>
        current.map(file => {
          const result = resultByClientId.get(file.id);
          if (!result) return file;
          return {
            ...file,
            imageFileId: result.image_file_id,
            uploadStatus: result.error ? 'error' : 'uploaded',
            aiStatus: result.ai_status,
            error: result.error ?? file.error,
          };
        })
      );

      if (imageIds.length > 0) {
        setMessage('AI检测处理中...');
        const finished = await pollAiStatus(imageIds);
        setMessage(finished ? '批量导入完成' : '批量导入已提交，AI仍在处理中');
      } else {
        setMessage('影像上传完成失败');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '批量导入失败');
    } finally {
      setIsUploading(false);
    }
  }, [
    examType,
    files,
    ownershipScope,
    patientId,
    pollAiStatus,
    prepareFiles,
    teamIds,
    uploadSession,
  ]);

  return {
    overlayOpen,
    files,
    patientId,
    examType,
    examTypes: EXAM_TYPES,
    ownershipScope,
    teamIds,
    lrFlip,
    isUploading,
    message,
    loadTeams,
    handleFileInput,
    closeOverlay,
    setPatientId,
    setExamType,
    setOwnershipScope,
    setTeamIds,
    toggleFlip: () => setLrFlip(value => !value),
    startImport,
  };
}
