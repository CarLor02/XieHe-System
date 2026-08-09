import type { Point } from '../contracts';

import { calculateDistance2D, pointToLineDistance } from './point';

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

export function isPointNearCircle(
  point: Point,
  center: Point,
  radius: number,
  tolerance = 0
): boolean {
  return Math.abs(calculateDistance2D(point, center) - radius) <= tolerance;
}

export function isPointNearEllipse(
  point: Point,
  center: Point,
  radiusX: number,
  radiusY: number,
  tolerance = 0
): boolean {
  if (radiusX === 0 || radiusY === 0) return false;

  const normalizedDistance = Math.hypot(
    (point.x - center.x) / radiusX,
    (point.y - center.y) / radiusY
  );
  return Math.abs(normalizedDistance - 1) <= tolerance / Math.min(radiusX, radiusY);
}
