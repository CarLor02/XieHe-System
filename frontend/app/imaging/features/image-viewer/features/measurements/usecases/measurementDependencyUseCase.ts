import {
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { getDescriptionForType } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-metadata';
import {
  AnnotationSource,
  CfhAnnotation,
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

export const LATERAL_CFH_DEPENDENT_MEASUREMENT_TYPES = new Set([
  'pi',
  'pt',
  'tpa',
]);

export const LATERAL_S1_DEPENDENT_MEASUREMENT_TYPES = new Set([
  'ss',
  'll-l1-s1',
  'll-l4-s1',
  'pi',
  'pt',
  'tpa',
  'sva',
]);

export function measurementTypeInSet(
  measurement: MeasurementData,
  typeIds: Set<string>
): boolean {
  return typeIds.has(getAnnotationTypeId(measurement.type));
}

export function extractCfhAnnotationFromMeasurements(
  measurements: MeasurementData[]
): CfhAnnotation | null {
  for (const measurement of measurements) {
    const typeId = getAnnotationTypeId(measurement.type);
    const point =
      typeId === 'pi' || typeId === 'pt'
        ? measurement.points[0]
        : typeId === 'tpa'
          ? measurement.points[4]
          : null;
    if (point) {
      return { center: point, confidence: 1, source: AnnotationSource.MANUAL };
    }
  }
  return null;
}

export function restorePiPtFromSsAndCfh(
  measurements: MeasurementData[],
  cfh: CfhAnnotation,
  calculateValue: (typeId: string, points: Point[]) => string
): MeasurementData[] {
  const ss = [...measurements]
    .reverse()
    .find(
      measurement =>
        getAnnotationTypeId(measurement.type) === 'ss' &&
        measurement.points.length >= 2
    );
  if (!ss) return measurements;

  let next = measurements;
  for (const typeId of ['pi', 'pt']) {
    if (
      next.some(
        measurement => getAnnotationTypeId(measurement.type) === typeId
      )
    ) {
      continue;
    }
    const points = [cfh.center, ss.points[0], ss.points[1]];
    next = [
      ...next,
      {
        id: `${Date.now()}-restored-${typeId}-${next.length}`,
        type: typeId,
        value: calculateValue(typeId, points),
        points,
        description: getDescriptionForType(typeId),
      },
    ];
  }
  return next;
}
