import type { Point } from '@xiehe/imaging-core/contracts';
import {
  calculateDistance2D,
  pointToLineDistance,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/geometry';

/** 手动工具共享的点、线命中规则，容差使用图像坐标。 */
export function isPointNearPoint(
  mousePoint: Point,
  targetPoint: Point,
  tolerance = 10
): boolean {
  return calculateDistance2D(mousePoint, targetPoint) <= tolerance;
}

export function isPointNearLine(
  mousePoint: Point,
  lineStart: Point,
  lineEnd: Point,
  tolerance = 10
): boolean {
  return pointToLineDistance(mousePoint, lineStart, lineEnd) <= tolerance;
}

export function isTwoPointLineInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  if (points.length < 2) return false;
  return (
    points.some(point => isPointNearPoint(mousePoint, point, tolerance)) ||
    isPointNearLine(mousePoint, points[0], points[1], tolerance)
  );
}
