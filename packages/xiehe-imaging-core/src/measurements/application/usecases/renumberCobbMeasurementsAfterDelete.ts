import type { MeasurementData } from '../../../shared/domain/contracts';
import { renumberCobbTypesAfterDelete } from '../../domain';
import type { CalculationContext } from '../../domain';
import type { MeasurementValueCalculator } from '../ports';

/**
 * 删除 Cobb 后执行“领域编号 + 应用层数值重算”。
 *
 * measurement.id 及端椎字段由对象展开完整保留，仅 type 和必要的 value 会变化。
 */
export function renumberCobbMeasurementsAfterDelete(
  measurements: MeasurementData[],
  calculationContext: CalculationContext,
  calculator: MeasurementValueCalculator
): MeasurementData[] {
  return renumberCobbTypesAfterDelete(measurements).map(
    (measurement, index) => {
      if (measurement === measurements[index]) return measurement;
      return {
        ...measurement,
        value:
          calculator.calculateType(
            measurement.type,
            measurement.points,
            calculationContext
          ) || measurement.value,
      };
    }
  );
}
