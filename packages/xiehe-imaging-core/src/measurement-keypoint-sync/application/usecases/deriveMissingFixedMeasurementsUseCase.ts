import {
  filterUniqueAnnotationDuplicates,
  getAnnotationTypeId,
  type CalculationContext,
} from '../../../measurements/domain';
import type { MeasurementValueCalculator } from '../../../measurements/application/ports';
import type { KeypointAnnotation } from '../../../keypoints/domain';
import type { MeasurementData } from '../../../shared/domain/contracts';

import {
  getAutoDeriveMeasurementKeypointBindingRules,
  getMeasurementKeypointBindingRule,
} from '../../domain';
import { deriveFixedMeasurements } from './deriveFixedMeasurementsUseCase';
import { derivePelvicMeasurements } from './derivePelvicMeasurementsUseCase';
import { orderDerivedMeasurementsByBindingRules } from '../orderDerivedMeasurementsByBindingRules';

const DYNAMIC_PELVIC_RULE_IDS = new Set(['pi', 'pt', 'tpa']);

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
  calculator,
}: {
  previousMeasurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
  calculator: MeasurementValueCalculator;
}): MeasurementData[] {
  const existingTypes = new Set(
    previousMeasurements.map(getCanonicalBindingType)
  );
  const autoDeriveRules =
    getAutoDeriveMeasurementKeypointBindingRules(examType);
  const fixedCandidates = deriveFixedMeasurements({
    rules: autoDeriveRules.filter(
      rule => !DYNAMIC_PELVIC_RULE_IDS.has(rule.typeId)
    ),
    keypoints,
    calculationContext,
    calculator,
  });
  const pelvicCandidates = derivePelvicMeasurements({
    keypoints,
    previousMeasurements,
    calculationContext,
    calculator,
  });
  const candidates = orderDerivedMeasurementsByBindingRules(autoDeriveRules, [
    ...fixedCandidates,
    ...pelvicCandidates,
  ]).filter(
    candidate => !existingTypes.has(getCanonicalBindingType(candidate))
  );

  return candidates.length === 0
    ? previousMeasurements
    : filterUniqueAnnotationDuplicates([
        ...previousMeasurements,
        ...candidates,
      ]);
}
