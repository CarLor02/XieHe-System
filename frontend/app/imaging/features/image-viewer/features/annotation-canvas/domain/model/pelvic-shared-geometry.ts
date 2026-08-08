import { isBilateralPelvicMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

/** PI/PT/TPA 共享同一组双 FH 几何，只允许首个可见测量项拥有显示和命中。 */
export function getBilateralPelvicGeometryOwnerId(
  measurements: readonly MeasurementData[],
  isHidden: (measurement: MeasurementData) => boolean = () => false
): string | null {
  return (
    measurements.find(
      measurement =>
        !isHidden(measurement) && isBilateralPelvicMeasurement(measurement)
    )?.id ?? null
  );
}
