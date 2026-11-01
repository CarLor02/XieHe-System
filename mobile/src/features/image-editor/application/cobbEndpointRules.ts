import { isLateralExamType } from '@xiehe/imaging-core/anatomy';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import {
  hasCobbMeasurementForEndpoints,
  isValidMeasurementDeriveEndpointOrder,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import { getLateralNamedCobbMeasurementRuleByEndpoints } from '@xiehe/imaging-core/measurements/lateral';

export type CobbEndpointField = 'upperVertebra' | 'lowerVertebra';

/** 新建和改绑共用端椎约束；待定端椎允许分两次补齐。 */
export function validateCobbEndpoints(
  measurements: MeasurementData[],
  examType: string,
  upper: string,
  lower: string,
  excludeMeasurementId?: string
): void {
  if (!upper || !lower) return;
  if (!isValidMeasurementDeriveEndpointOrder(upper, lower))
    throw new Error('上端椎不应该比下端椎更靠下或与下端椎相同');
  if (
    hasCobbMeasurementForEndpoints(
      measurements.filter(item => item.id !== excludeMeasurementId),
      upper,
      lower
    )
  )
    throw new Error(`Cobb${upper}-${lower}已经存在，不可重复派生`);
  if (
    isLateralExamType(examType) &&
    getLateralNamedCobbMeasurementRuleByEndpoints(upper, lower)
  )
    throw new Error('请使用专用工具创建此测量项');
}
