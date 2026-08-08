import { useCallback, useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import {
  batchUpdateImageExamType,
  type BatchUpdateImageExamTypeResult,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

const logger = createLogger(
  'app.imaging.features.batch.exam.type.hooks.useBatchExamTypeUpdate'
);

interface UseBatchExamTypeUpdateOptions {
  selectedImages: ImageFile[];
  reloadImages: () => Promise<void>;
  onUpdated: (updatedIds: number[], examType: string) => void;
  updateExamType?: typeof batchUpdateImageExamType;
}

export function useBatchExamTypeUpdate({
  selectedImages,
  reloadImages,
  onUpdated,
  updateExamType = batchUpdateImageExamType,
}: UseBatchExamTypeUpdateOptions) {
  const [examType, setExamType] = useState('');
  const [isSetting, setIsSetting] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reset = useCallback(() => {
    setExamType('');
    setMessage('');
    setConfirmOpen(false);
  }, []);

  const requestSet = useCallback(() => {
    if (!examType || selectedImages.length === 0) return;
    const hasChangedImage = selectedImages.some(
      image => image.description !== examType
    );
    if (!hasChangedImage) {
      setMessage(`所选影像均已是${examType}，无需重复设置`);
      return;
    }
    setConfirmOpen(true);
  }, [examType, selectedImages]);

  const cancelSet = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const confirmSet = useCallback(async () => {
    if (!examType || selectedImages.length === 0 || isSetting) return;
    setConfirmOpen(false);
    setIsSetting(true);
    setMessage('');

    try {
      const result: BatchUpdateImageExamTypeResult =
        await updateExamType(
          selectedImages.map(image => image.id),
          examType
        );
      onUpdated(result.updated_ids, result.exam_type);
      await reloadImages();
      setMessage(
        `成功设置 ${result.updated_count} 张影像，跳过 ${result.unchanged_count} 张同类型影像`
      );
    } catch (error: unknown) {
      logger.error('批量设置影像类型失败', error);
      setMessage(getErrorMessage(error, '批量设置影像类型失败，请重试'));
    } finally {
      setIsSetting(false);
    }
  }, [
    examType,
    isSetting,
    onUpdated,
    reloadImages,
    selectedImages,
    updateExamType,
  ]);

  return {
    examType,
    isSetting,
    message,
    confirmOpen,
    setExamType,
    reset,
    requestSet,
    cancelSet,
    confirmSet,
  };
}
