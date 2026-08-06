import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

import { getToolCompletionDerivationRules } from '../../domain/derivation/tool-completion-derivation';
import { deriveFixedMeasurements } from './deriveFixedMeasurementsUseCase';

/**
 * 手动工具完成后的局部派生入口。
 *
 * 与 AI 初次检测的全量派生不同，该流程只能创建依赖于本次工具完整点集的
 * 测量项，避免图像中其他历史关键点意外恢复已经删除或无关的测量项。
 */
export function deriveMeasurementsAfterToolCompletion({
  previousMeasurements,
  completedToolType,
  keypoints,
  examType,
  calculationContext,
}: {
  previousMeasurements: MeasurementData[];
  completedToolType: string;
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
}): MeasurementData[] {
  const rules = getToolCompletionDerivationRules(completedToolType, examType);
  if (rules.length === 0) return previousMeasurements;

  const existingTypeIds = new Set(
    previousMeasurements.map(measurement =>
      getAnnotationTypeId(measurement.type)
    )
  );
  const candidates = deriveFixedMeasurements({
    rules,
    keypoints,
    calculationContext,
  }).filter(
    measurement => !existingTypeIds.has(getAnnotationTypeId(measurement.type))
  );

  if (candidates.length === 0) return previousMeasurements;
  return filterUniqueAnnotationDuplicates([
    ...previousMeasurements,
    ...candidates,
  ]);
}
