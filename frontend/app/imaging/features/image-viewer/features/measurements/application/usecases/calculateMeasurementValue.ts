/**
 * 标注值计算分派。
 * 该用例通过 catalog 找到工具，再调用已迁入 manual-tools/domain 的纯公式。
 */

import {
  getAnnotationConfig,
  getAnnotationDisplayName,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { calculateAvtValue } from '@xiehe/imaging-core/measurements/ap';
import { calculateTtsResults } from '@xiehe/imaging-core/measurements/ap';
import {
  resolveVariableMeasurement,
  type ResolvedVariableMeasurement,
} from '@xiehe/imaging-core/measurements';
import { calculatePiResultsFromGeometry } from '@xiehe/imaging-core/measurements/lateral';
import { calculatePtResultsFromGeometry } from '@xiehe/imaging-core/measurements/lateral';
import { calculateTpaResultsFromGeometry } from '@xiehe/imaging-core/measurements/lateral';
import { calculateCobbResults } from '@xiehe/imaging-core/measurements';
import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';

function inferResolverExamType(measurement: MeasurementData): string {
  const typeId = getAnnotationTypeId(measurement.type);
  if (
    typeId.startsWith('lateral-cobb') ||
    [
      'cl',
      'c2-c7-cl',
      'tk-t2-t5',
      'tk-t5-t12',
      't10-l2',
      'll-l1-s1',
      'll-l1-l4',
      'll-l4-s1',
      'pi',
      'pt',
      'tpa',
    ].includes(typeId)
  ) {
    return '侧位X光片';
  }
  return '正位X光片';
}

function formatFirstResult(
  results: ReturnType<typeof calculateCobbResults>,
  fallback: string
): string {
  return results[0] ? `${results[0].value}${results[0].unit}` : fallback;
}

function calculateResolvedMeasurementValue(
  resolvedMeasurement: ResolvedVariableMeasurement,
  context: CalculationContext
): string {
  switch (resolvedMeasurement.kind) {
    case 'avt':
      return (
        calculateAvtValue(resolvedMeasurement.measurement, context) ??
        resolvedMeasurement.measurement.value
      );
    case 'cobb':
      return formatFirstResult(
        calculateCobbResults([...resolvedMeasurement.points]),
        resolvedMeasurement.measurement.value
      );
    case 'tts':
      return formatFirstResult(
        calculateTtsResults(
          [...resolvedMeasurement.interactivePoints],
          context
        ),
        resolvedMeasurement.measurement.value
      );
    case 'pelvic': {
      if (resolvedMeasurement.toolId === 'pi') {
        return formatFirstResult(
          calculatePiResultsFromGeometry(resolvedMeasurement.geometry),
          resolvedMeasurement.measurement.value
        );
      }
      if (resolvedMeasurement.toolId === 'pt') {
        return formatFirstResult(
          calculatePtResultsFromGeometry(resolvedMeasurement.geometry),
          resolvedMeasurement.measurement.value
        );
      }
      const t1Points = resolvedMeasurement.t1Points;
      if (!t1Points) return resolvedMeasurement.measurement.value;
      const t1Center = {
        x: t1Points.reduce((sum, point) => sum + point.x, 0) / 4,
        y: t1Points.reduce((sum, point) => sum + point.y, 0) / 4,
      };
      return formatFirstResult(
        calculateTpaResultsFromGeometry(t1Center, resolvedMeasurement.geometry),
        resolvedMeasurement.measurement.value
      );
    }
  }
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
  const resolution = resolveVariableMeasurement(measurement, {
    examType: context.examType ?? inferResolverExamType(measurement),
  });
  if (resolution.status === 'resolved') {
    return calculateResolvedMeasurementValue(resolution.value, context);
  }
  if (resolution.status === 'invalid') {
    return measurement.value;
  }
  return calculateMeasurementValue(
    measurement.type,
    measurement.points,
    context
  );
}
