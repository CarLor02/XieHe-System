import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';
import {
  calculateMeasurementResults,
  calculateMeasurementTypeResults,
  resolveVariableMeasurement,
  type MeasurementValueCalculator,
} from '@xiehe/imaging-core/measurements';

/** 与 Web 使用同一计算端口；本端只适配数值和单位的展示。 */
export const measurementCalculator: MeasurementValueCalculator = {
  calculateType(type, points, context) {
    if (type.startsWith('AI检测-')) return '';
    const outcome = calculateMeasurementTypeResults(type, points, context);
    const result = outcome.status === 'calculated' ? outcome.results[0] : null;
    const config = getAnnotationConfig(type);
    return result
      ? `${result.value}${result.unit}`
      : config?.category === 'auxiliary'
        ? config.name
        : '辅助标注';
  },
  calculateMeasurement(measurement, context) {
    if (!getAnnotationConfig(measurement.type)) return measurement.value;
    const outcome = calculateMeasurementResults(measurement, context);
    const result = outcome.status === 'calculated' ? outcome.results[0] : null;
    if (result) return `${result.value}${result.unit}`;
    if (
      resolveVariableMeasurement(measurement, {
        examType: context.examType ?? '',
      }).status === 'invalid'
    )
      return measurement.value;
    return measurementCalculator.calculateType(
      measurement.type,
      measurement.points,
      context
    );
  },
};
