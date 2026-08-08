import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  extractBilateralPelvicPoints,
  getPelvicMeasurementGeometry,
  replaceBilateralPelvicPoints,
  type PelvicToolId,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { PelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

export function getBilateralPelvicPointsForMeasurement(
  measurement: MeasurementData
) {
  const typeId = getAnnotationTypeId(measurement.type);
  if (typeId !== 'pi' && typeId !== 'pt' && typeId !== 'tpa') return null;
  if (measurement.pelvicMetadata?.femoralHeadMode !== 'bilateral') return null;
  return extractBilateralPelvicPoints(typeId, measurement.points);
}

export function replaceBilateralPelvicPointsForMeasurement(
  measurement: MeasurementData,
  pelvicPoints: MeasurementData['points']
): MeasurementData['points'] {
  const typeId = getAnnotationTypeId(measurement.type);
  if (typeId !== 'pi' && typeId !== 'pt' && typeId !== 'tpa') {
    return measurement.points.map(point => ({ ...point }));
  }
  return replaceBilateralPelvicPoints(
    typeId as PelvicToolId,
    measurement.points,
    pelvicPoints
  );
}

export function isBilateralPelvicMeasurement(
  measurement: MeasurementData
): boolean {
  return getBilateralPelvicPointsForMeasurement(measurement) !== null;
}

/**
 * 从完整 measurement 解析共享双 FH 几何。
 * TPA 的前四点属于 T1，必须先提取后六点骨盆片段；禁止调用方直接把十点
 * TPA 传给只认识三点/六点布局的 getPelvicMeasurementGeometry()。
 */
export function getBilateralPelvicGeometryForMeasurement(
  measurement: MeasurementData
): PelvicMeasurementGeometry | null {
  const pelvicPoints = getBilateralPelvicPointsForMeasurement(measurement);
  return pelvicPoints ? getPelvicMeasurementGeometry(pelvicPoints) : null;
}

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
