import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  calculateActualDistance,
  type CalculationContext,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';
import { getAvtGeometry } from './measurement-geometry';

type AvtMeasurementLike = Pick<
  MeasurementData,
  'points' | 'apexVertebra' | 'avtMetadata'
>;

export function calculateAvtValue(
  measurement: AvtMeasurementLike,
  context: CalculationContext
): string | null {
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return null;

  const pixelOffset = geometry.targetCenter.x - geometry.referenceCenter.x;
  const actualDistance = calculateActualDistance(
    Math.abs(pixelOffset),
    context
  );
  const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;
  return `${signedDistance.toFixed(2)}mm`;
}

export function getAvtLabelPosition(measurement: AvtMeasurementLike): Point {
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return measurement.points[0] ?? { x: 0, y: 0 };
  if (geometry.layout === 'legacy-two-point') return geometry.targetCenter;

  return {
    x: Math.max(...geometry.targetPoints.map(point => point.x)),
    y: geometry.targetCenter.y,
  };
}
