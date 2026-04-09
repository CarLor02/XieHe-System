/**
 * 标注值计算规则。
 * 这一层只保留纯业务公式，不再依赖过渡聚合文件。
 */

import {
  CalculationContext,
  Point,
  getAnnotationConfig,
} from '../catalog/annotation-catalog';

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

  // 特殊处理：CobbN 类型使用 cobb 配置
  const configType = /^Cobb\d+$/i.test(type) ? 'cobb' : type;
  const config = getAnnotationConfig(configType);

  if (!config) {
    return '辅助标注';
  }

  const results = config.calculateResults(points, context);

  if (results.length === 0) {
    return '辅助标注';
  }

  // 如果有多个测量结果，返回第一个
  return `${results[0].value}${results[0].unit}`;
}
