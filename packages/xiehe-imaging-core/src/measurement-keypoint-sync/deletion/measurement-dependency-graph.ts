import { getAnnotationTypeId } from '../../measurements';
import { resolveCobbEndpointPointIds } from '../../measurements';
import {
  isApProjectionExamType,
  isLateralExamType,
} from '../../anatomy';
import type { MeasurementData } from '../../contracts';

import { getMeasurementKeypointBindingRuleForMeasurement } from '../measurement-keypoint-binding';
import {
  isCobbMeasurement,
  isDerivedCobbMeasurement,
} from '../measurement-keypoint-query';

export interface MeasurementKeypointDependency {
  measurementId: string;
  keypointIds: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function getCobbKeypointIds(
  measurement: MeasurementData,
  examType: string
): string[] {
  if (
    !isDerivedCobbMeasurement(measurement) ||
    !measurement.upperVertebra ||
    !measurement.lowerVertebra
  ) {
    return [];
  }

  const endpointPointIds = resolveCobbEndpointPointIds(measurement, {
    examType,
  });
  return endpointPointIds ? [...endpointPointIds] : [];
}

/**
 * 返回测量项确切绑定的全局关键点。
 *
 * 删除逻辑只能使用领域绑定和持久化 metadata，不能根据坐标重合猜测依赖；
 * 否则两个语义不同但位置重叠的点会被错误地视为同一关键点。
 */
export function getMeasurementRequiredKeypointIds(
  measurement: MeasurementData,
  examType: string
): string[] {
  if (isCobbMeasurement(measurement)) {
    return getCobbKeypointIds(measurement, examType);
  }

  if (
    getAnnotationTypeId(measurement.type) === 'vertebra-center' &&
    measurement.upperVertebra
  ) {
    const vertebra = measurement.upperVertebra.trim().toUpperCase();
    return vertebra
      ? [1, 2, 3, 4].map(sequence => `${vertebra}-${sequence}`)
      : [];
  }

  const rule = getMeasurementKeypointBindingRuleForMeasurement(measurement);
  if (!rule) return [];
  if (rule.examView === 'ap' && !isApProjectionExamType(examType)) return [];
  if (rule.examView === 'lateral' && !isLateralExamType(examType)) return [];
  return unique(rule.requiredKeypointIds);
}

export function buildMeasurementKeypointDependencyGraph(
  measurements: readonly MeasurementData[],
  examType: string
): MeasurementKeypointDependency[] {
  return measurements.map(measurement => ({
    measurementId: measurement.id,
    keypointIds: getMeasurementRequiredKeypointIds(measurement, examType),
  }));
}
