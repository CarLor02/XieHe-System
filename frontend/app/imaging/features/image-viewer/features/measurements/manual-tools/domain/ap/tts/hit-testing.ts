import { isPointNearPoint } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * TTS 命中两组端点及其水平中线。
 *
 * 点序为 [躯干左端, 躯干右端, 骶骨端点1, 骶骨端点2]。
 */
export function isTtsInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  if (points.length < 1) return false;
  if (points.some(point => isPointNearPoint(mousePoint, point, tolerance))) {
    return true;
  }
  if (
    points.length >= 2 &&
    Math.abs(mousePoint.x - (points[0].x + points[1].x) / 2) <= tolerance
  ) {
    return true;
  }
  return (
    points.length >= 4 &&
    Math.abs(mousePoint.x - (points[2].x + points[3].x) / 2) <= tolerance
  );
}
