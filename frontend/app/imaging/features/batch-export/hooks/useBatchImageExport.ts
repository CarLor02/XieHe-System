import { useCallback, useMemo, useState } from 'react';
import { useUser } from '@/lib/api';
import {
  getImageAnnotations,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

import { type ExportContentType } from '../domain';
import { buildBatchExportFiles, downloadExportFiles } from '../usecases';
import { useExportContentOptions } from './use-export-content-options';
import { createLogger } from '@/lib/logger';

const logger = createLogger(
  'app.imaging.features.batch.export.hooks.useBatchImageExport'
);

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

function isPrivilegedExportContent(exportContent: ExportContentType): boolean {
  return (
    exportContent === 'annotation-points' ||
    exportContent === 'training-data' ||
    exportContent === 'labelme-compatible-data'
  );
}

export function useBatchImageExport(selectedImages: ImageFile[]) {
  const { user } = useUser();
  const canExportAnnotationPoints = canExportPrivilegedData(user);
  const exportContentOptions = useExportContentOptions(
    canExportAnnotationPoints
  );

  const [exportContent, setExportContent] =
    useState<ExportContentType>('original-image');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');

  const effectiveExportContent = useMemo(
    () =>
      isPrivilegedExportContent(exportContent) && !canExportAnnotationPoints
        ? 'original-image'
        : exportContent,
    [canExportAnnotationPoints, exportContent]
  );

  const reset = useCallback(() => {
    setExportMessage('');
    setExportProgress(0);
  }, []);

  const startBatchExport = useCallback(async () => {
    if (selectedImages.length === 0) {
      setExportMessage('请先选择要导出的影像');
      return;
    }

    if (
      isPrivilegedExportContent(effectiveExportContent) &&
      !canExportAnnotationPoints
    ) {
      setExportMessage('当前账号无权导出标注点检测数据');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('');

    try {
      const annotationItems =
        effectiveExportContent === 'original-image'
          ? []
          : await getImageAnnotations(selectedImages.map(image => image.id));
      const annotationsById = new Map(
        annotationItems.map(item => [item.id, item])
      );
      const files = await buildBatchExportFiles({
        images: selectedImages.map(image => ({
          ...image,
          annotation: annotationsById.get(image.id)?.annotation ?? null,
        })),
        exportContent: effectiveExportContent,
        onProgress: setExportProgress,
      });
      const zipFilename = `data_export_${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadExportFiles(files, zipFilename);
      setExportProgress(100);
      setExportMessage(`成功导出 ${files.length} 个文件！`);
    } catch (error: unknown) {
      logger.error('导出失败:', error);
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setExportMessage(message || '导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [canExportAnnotationPoints, effectiveExportContent, selectedImages]);

  return {
    exportContent: effectiveExportContent,
    exportContentOptions,
    isExporting,
    exportProgress,
    exportMessage,
    setExportContent,
    reset,
    startBatchExport,
  };
}
