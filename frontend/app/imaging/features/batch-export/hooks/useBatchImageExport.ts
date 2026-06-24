import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@/lib/api';
import type { ImageFile } from '@/services/imageServices/imageFileService';

import { type ExportContentType } from '../domain';
import { buildBatchExportFiles, downloadExportFiles } from '../usecases';
import { useExportContentOptions } from './use-export-content-options';

function canExportPrivilegedData(user: ReturnType<typeof useUser>['user']) {
  return Boolean(
    user?.is_superuser ||
      user?.is_system_admin ||
      user?.role === 'admin' ||
      user?.role === 'system_admin' ||
      user?.role === 'team_admin' ||
      user?.role === 'ADMIN'
  );
}

export function useBatchImageExport(imageFiles: ImageFile[]) {
  const { user } = useUser();
  const canExportAnnotationPoints = canExportPrivilegedData(user);
  const exportContentOptions = useExportContentOptions(canExportAnnotationPoints);

  const [isBatchExportMode, setIsBatchExportMode] = useState(false);
  const [selectedExportImages, setSelectedExportImages] = useState<
    Map<number, ImageFile>
  >(new Map());
  const [exportContent, setExportContent] =
    useState<ExportContentType>('original-image');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');

  const selectedExportIds = useMemo(
    () => new Set(selectedExportImages.keys()),
    [selectedExportImages]
  );
  const selectedExportCount = selectedExportImages.size;
  const selectedImages = useMemo(
    () => Array.from(selectedExportImages.values()),
    [selectedExportImages]
  );

  useEffect(() => {
    if (
      (exportContent === 'annotation-points' || exportContent === 'training-data') &&
      !canExportAnnotationPoints
    ) {
      setExportContent('original-image');
    }
  }, [canExportAnnotationPoints, exportContent]);

  const clearExportSelection = useCallback(() => {
    setSelectedExportImages(new Map());
  }, []);

  const exitBatchExportMode = useCallback(() => {
    setIsBatchExportMode(false);
    setSelectedExportImages(new Map());
    setExportMessage('');
    setExportProgress(0);
  }, []);

  const toggleBatchExportMode = useCallback(() => {
    setIsBatchExportMode(current => {
      if (current) {
        setSelectedExportImages(new Map());
        setExportMessage('');
        setExportProgress(0);
      }
      return !current;
    });
  }, []);

  const toggleExportSelection = useCallback(
    (imageId: number) => {
      const imageFile = imageFiles.find(image => image.id === imageId);
      setSelectedExportImages(current => {
        const next = new Map(current);
        if (next.has(imageId)) {
          next.delete(imageId);
        } else if (imageFile) {
          next.set(imageId, imageFile);
        }
        return next;
      });
    },
    [imageFiles]
  );

  const startBatchExport = useCallback(async () => {
    if (selectedImages.length === 0) {
      setExportMessage('请先选择要导出的影像');
      return;
    }

    if (
      (exportContent === 'annotation-points' || exportContent === 'training-data') &&
      !canExportAnnotationPoints
    ) {
      setExportMessage('当前账号无权导出标注点检测数据');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('');

    try {
      const files = await buildBatchExportFiles({
        images: selectedImages,
        exportContent,
        onProgress: setExportProgress,
      });
      const zipFilename = `data_export_${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadExportFiles(files, zipFilename);
      setExportProgress(100);
      setExportMessage(`成功导出 ${files.length} 个文件！`);
    } catch (error: unknown) {
      console.error('导出失败:', error);
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      setExportMessage(message || '导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [canExportAnnotationPoints, exportContent, selectedImages]);

  return {
    isBatchExportMode,
    selectedExportIds,
    selectedExportCount,
    exportContent,
    exportContentOptions,
    isExporting,
    exportProgress,
    exportMessage,
    setExportContent,
    toggleBatchExportMode,
    exitBatchExportMode,
    clearExportSelection,
    toggleExportSelection,
    startBatchExport,
  };
}
