import type { MeasurementData, Point } from '../../../shared/domain/contracts';
import type { CalculationContext } from '../../domain';

/**
 * 应用用例依赖的测量值计算端口。
 *
 * Domain 只产出结构化计算结果；具体字符串兼容策略由 Web、RN 等平台适配器负责。
 */
export interface MeasurementValueCalculator {
  calculateType(
    type: string,
    points: Point[],
    context: CalculationContext
  ): string;
  calculateMeasurement(
    measurement: MeasurementData,
    context: CalculationContext
  ): string;
}
