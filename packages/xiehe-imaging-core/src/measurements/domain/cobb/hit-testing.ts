import type { Point } from '../../../shared/domain/contracts';
import { isPointNearLine, isPointNearPoint } from '../../../shared/domain/geometry';

/** Cobb 的两个终板线段及四个端点均可命中。 */
export function isCobbInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  if (points.length < 4) return false;
  return (
    points.some(point => isPointNearPoint(mousePoint, point, tolerance)) ||
    isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
    isPointNearLine(mousePoint, points[2], points[3], tolerance)
  );
}
