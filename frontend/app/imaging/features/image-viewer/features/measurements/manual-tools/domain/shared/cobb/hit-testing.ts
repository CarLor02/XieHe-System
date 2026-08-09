import { isPointNearLine, isPointNearPoint } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@xiehe/imaging-core/contracts';

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
