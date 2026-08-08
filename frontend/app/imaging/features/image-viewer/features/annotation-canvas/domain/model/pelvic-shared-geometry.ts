import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

export function isBilateralPelvicMeasurement(
  measurement: MeasurementData
): boolean {
  const typeId = getAnnotationTypeId(measurement.type);
  return (
    (typeId === 'pi' || typeId === 'pt') &&
    measurement.pelvicMetadata?.femoralHeadMode === 'bilateral' &&
    measurement.points.length === 6
  );
}

/** PI/PT 共享同一组双 FH 几何，只允许首个可见测量项拥有显示和命中。 */
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
