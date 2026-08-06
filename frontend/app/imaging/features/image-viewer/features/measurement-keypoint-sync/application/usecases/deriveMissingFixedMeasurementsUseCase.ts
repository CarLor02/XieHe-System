import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

import {
  getAutoDeriveMeasurementKeypointBindingRules,
  getMeasurementKeypointBindingRule,
} from '../../domain/measurement-keypoint-binding';
import { deriveFixedMeasurements } from './deriveFixedMeasurementsUseCase';

function getCanonicalBindingType(measurement: MeasurementData): string {
  return (
    getMeasurementKeypointBindingRule(measurement.type)?.typeId ??
    getAnnotationTypeId(measurement.type)
  );
}

/**
 * 显式确认关键点后，补齐当前关键点能够确定的全部固定测量项。
 *
 * 该入口故意不调用 Cobb/AVT/TTS/椎体中心派生：Cobb 只在 AI 初检或专用
 * 流程创建，其余动态工具也必须保留自己的交互契约。
 */
export function deriveMissingFixedMeasurementsFromKeypoints({
  previousMeasurements,
  keypoints,
  examType,
  calculationContext,
}: {
  previousMeasurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
}): MeasurementData[] {
  const existingTypes = new Set(
    previousMeasurements.map(getCanonicalBindingType)
  );
  const candidates = deriveFixedMeasurements({
    rules: getAutoDeriveMeasurementKeypointBindingRules(examType),
    keypoints,
    calculationContext,
  }).filter(candidate => !existingTypes.has(getCanonicalBindingType(candidate)));

  return candidates.length === 0
    ? previousMeasurements
    : filterUniqueAnnotationDuplicates([...previousMeasurements, ...candidates]);
}
