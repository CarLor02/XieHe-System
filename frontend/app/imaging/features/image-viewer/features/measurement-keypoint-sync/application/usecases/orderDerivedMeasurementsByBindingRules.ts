import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

import type { MeasurementKeypointBindingRule } from '../../domain/binding-rule-types';

/**
 * 动态规则与固定规则分开计算后，仍按领域 catalog 的声明顺序合并。
 * 这保证引入 effectiveCFH 等动态依赖不会改变结果列表的稳定顺序。
 */
export function orderDerivedMeasurementsByBindingRules(
  rules: readonly MeasurementKeypointBindingRule[],
  measurements: readonly MeasurementData[]
): MeasurementData[] {
  const byType = new Map(
    measurements.map(measurement => [
      getAnnotationTypeId(measurement.type),
      measurement,
    ])
  );
  return rules.flatMap(rule => {
    const measurement = byType.get(rule.typeId);
    return measurement ? [measurement] : [];
  });
}
