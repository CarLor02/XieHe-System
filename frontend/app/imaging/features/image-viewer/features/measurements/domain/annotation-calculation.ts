/**
 * 标注值计算规则。
 * 这一层只保留纯业务公式，不再依赖过渡聚合文件。
 */

import {
  CalculationContext,
  Point,
  getAnnotationConfig,
  getAnnotationDisplayName,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import { calculateAvtValue } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/avt';

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

  // 特殊处理：CobbN 类型使用对应的基础 Cobb 配置。
  const configType = /^lateral-Cobb\d+$/i.test(type)
    ? 'lateral-cobb'
    : /^Cobb\d+$/i.test(type)
      ? 'cobb'
      : getAnnotationTypeId(type);
  const config = getAnnotationConfig(configType);

  if (!config) {
    return '辅助标注';
  }

  const results = config.calculateResults(points, context);

  if (results.length === 0) {
    return config.category === 'auxiliary'
      ? getAnnotationDisplayName(config.id)
      : '辅助标注';
  }

  // 如果有多个测量结果，返回第一个
  return `${results[0].value}${results[0].unit}`;
}

/**
 * 对需要 measurement metadata 才能解析点布局的工具，使用完整测量实体计算。
 * 其他工具继续复用按 type + points 的 catalog 计算路径。
 */
export function calculateMeasurementDataValue(
  measurement: MeasurementData,
  context: CalculationContext
): string {
  if (getAnnotationTypeId(measurement.type) === 'avt') {
    return calculateAvtValue(measurement, context) ?? measurement.value;
  }
  return calculateMeasurementValue(
    measurement.type,
    measurement.points,
    context
  );
}
