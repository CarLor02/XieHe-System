import type { CalculationContext, MeasurementResult } from '@xiehe/imaging-core/measurements';
import { calculateActualDistance } from '@xiehe/imaging-core/measurements';
import { isPointNearLine, isPointNearPoint } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * TS 计算 C7 中心相对骶骨参考线中点的水平距离。
 *
 * 当前六点格式为 [C7四角点, SL, SR]；历史两点格式继续兼容旧标注。
 */
export function calculateTsResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  let c7CenterX: number;
  let referenceX: number;

  if (points.length >= 2 && points.length < 6) {
    // 历史兼容：旧 TS 仅保存 [C7中心, CSVL参考点]。
    c7CenterX = points[0].x;
    referenceX = points[1].x;
  } else if (points.length >= 6) {
    // 当前格式：[C7四角点, SL, SR]。
    c7CenterX = points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4;
    referenceX = (points[4].x + points[5].x) / 2;
  } else {
    return [];
  }

  const pixelOffset = c7CenterX - referenceX;
  const distance = calculateActualDistance(Math.abs(pixelOffset), context);
  return [
    {
      name: 'TS',
      value: (pixelOffset < 0 ? -distance : distance).toFixed(2),
      unit: 'mm',
    },
  ];
}

/** TS 可通过原始点、C7 中心和两条垂直参考线命中。 */
export function isTsInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  if (points.length >= 2 && points.length < 6) {
    return (
      isPointNearPoint(mousePoint, points[0], tolerance) ||
      isPointNearPoint(mousePoint, points[1], tolerance) ||
      isPointNearLine(mousePoint, points[0], points[1], tolerance)
    );
  }
  if (points.length < 6) return false;
  if (points.some(point => isPointNearPoint(mousePoint, point, tolerance))) {
    return true;
  }

  const c7Center = {
    x: points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4,
    y: points.slice(0, 4).reduce((sum, point) => sum + point.y, 0) / 4,
  };
  const referenceCenter = {
    x: (points[4].x + points[5].x) / 2,
    y: (points[4].y + points[5].y) / 2,
  };
  return (
    isPointNearPoint(mousePoint, c7Center, tolerance) ||
    isPointNearPoint(mousePoint, referenceCenter, tolerance) ||
    Math.abs(mousePoint.x - c7Center.x) <= tolerance ||
    Math.abs(mousePoint.x - referenceCenter.x) <= tolerance
  );
}
