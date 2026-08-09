/**
 * 标注值计算分派。
 * 数值计算由共享 Core 完成；Web catalog 只负责兼容既有展示兜底文案。
 */

import { getAnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  calculateMeasurementResults,
  calculateMeasurementTypeResults,
  inferMeasurementResolverExamType,
  resolveVariableMeasurement,
} from '@xiehe/imaging-core/measurements';
import type {
  CalculationContext,
  MeasurementCalculationOutcome,
  MeasurementValueCalculator,
} from '@xiehe/imaging-core/measurements';
import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';

function formatCalculatedOutcome(
  outcome: MeasurementCalculationOutcome
): string | null {
  const result = outcome.status === 'calculated' ? outcome.results[0] : null;
  return result ? `${result.value}${result.unit}` : null;
}

function getTypeFallback(type: string): string {
  const config = getAnnotationConfig(type);
  if (!config) return '辅助标注';
  return config.category === 'auxiliary' ? config.name : '辅助标注';
}

/**
 * 根据标注类型和点位计算测量值
 */
export function calculateMeasurementValue(
  type: string,
  points: Point[],
  context: CalculationContext
): string {
  // 特殊处理：AI检测的标注（type格式：AI检测-L1-1）
  if (type.startsWith('AI检测-')) {
    // AI检测的标注不需要计算值，直接返回空字符串
    return '';
  }

  const outcome = calculateMeasurementTypeResults(type, points, context);
  return formatCalculatedOutcome(outcome) ?? getTypeFallback(type);
}

/**
 * 对需要 measurement metadata 才能解析点布局的工具，使用完整测量实体计算。
 * 其他工具继续复用按 type + points 的 catalog 计算路径。
 */
export function calculateMeasurementDataValue(
  measurement: MeasurementData,
  context: CalculationContext
): string {
  const outcome = calculateMeasurementResults(measurement, context);
  const calculatedValue = formatCalculatedOutcome(outcome);
  if (calculatedValue !== null) return calculatedValue;

  const resolution = resolveVariableMeasurement(measurement, {
    examType:
      context.examType ?? inferMeasurementResolverExamType(measurement),
  });
  if (resolution.status === 'invalid') {
    return measurement.value;
  }
  return calculateMeasurementValue(
    measurement.type,
    measurement.points,
    context
  );
}

/** Web 对 Core 计算端口的字符串兼容适配器。 */
export const measurementValueCalculator: MeasurementValueCalculator = {
  calculateType: calculateMeasurementValue,
  calculateMeasurement: calculateMeasurementDataValue,
};
