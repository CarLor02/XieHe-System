import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { renumberCobbTypesAfterDelete } from '@xiehe/imaging-core/measurements';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';

/**
 * 删除 Cobb 后执行“领域编号 + 应用层数值重算”。
 *
 * measurement.id 及端椎字段由对象展开完整保留，仅 type 和必要的 value 会变化。
 */
export function renumberCobbMeasurementsAfterDelete(
  measurements: MeasurementData[],
  calculationContext: CalculationContext
): MeasurementData[] {
  return renumberCobbTypesAfterDelete(measurements).map(
    (measurement, index) => {
      if (measurement === measurements[index]) return measurement;
      return {
        ...measurement,
        value:
          calculateMeasurementValue(
            measurement.type,
            measurement.points,
            calculationContext
          ) || measurement.value,
      };
    }
  );
}
