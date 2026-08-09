import type {
  CalculationContext,
  MeasurementResult,
} from '../../../shared-rules';
import { calculateActualDistance } from '../../../shared-rules';
import type { Point } from '../../../../contracts';

/** LLD 取两条水平参考线之间的垂直距离。 */
export function calculateLldResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 2) return [];
  const distance = calculateActualDistance(
    Math.abs(points[1].y - points[0].y),
    context
  );
  return [{ name: 'LLD', value: distance.toFixed(2), unit: 'mm' }];
}

export function isLldInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  return (
    points.length >= 2 &&
    (Math.abs(mousePoint.y - points[0].y) <= tolerance ||
      Math.abs(mousePoint.y - points[1].y) <= tolerance)
  );
}
