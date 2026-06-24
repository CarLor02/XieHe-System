import { useMemo } from 'react';

import type { ExportContentType } from '../domain';

export interface ExportContentOption {
  value: ExportContentType;
  label: string;
  adminOnly?: boolean;
}

const EXPORT_CONTENT_OPTIONS: ExportContentOption[] = [
  { value: 'original-image', label: '原图影像' },
  { value: 'annotated-image', label: '绘图影像' },
  { value: 'annotation-points', label: '标注点检测', adminOnly: true },
  { value: 'measurement-parameters', label: '参数测量' },
  { value: 'training-data', label: '训练数据（图像+检测点）', adminOnly: true },
];

export function useExportContentOptions(
  canExportAnnotationPoints: boolean
): ExportContentOption[] {
  return useMemo(
    () =>
      EXPORT_CONTENT_OPTIONS.filter(
        option => !option.adminOnly || canExportAnnotationPoints
      ),
    [canExportAnnotationPoints]
  );
}
