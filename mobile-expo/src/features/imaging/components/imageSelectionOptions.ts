import type { ImageFileStatus } from '@xiehe/api-contracts';
import { EXAM_TYPES } from '@xiehe/imaging-core';
import type { SelectionOption } from '../../../shared/ui/selection-list';
import { imageStatusLabel } from '../domain/presentation';

export const examTypeOptions = EXAM_TYPES.map(value => ({
  value,
  label: value,
}));

export const examTypeFilterOptions = [
  { value: '', label: '全部类型' },
  ...examTypeOptions,
];

export const imageStatusFilterOptions: readonly SelectionOption<
  ImageFileStatus | undefined
>[] = [
  { value: undefined, label: '全部状态' },
  ...(['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'] as const).map(
    value => ({
      value,
      label: imageStatusLabel(value),
    })
  ),
];
