import type {
  CalculationContext,
  MeasurementResult,
} from '../../../shared-rules';
import { calculateActualDistance } from '../../../shared-rules';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * SVA 计算 C7 四角点中心到骶椎后缘参考点的水平距离。
 *
 * 点序为 [C7四角点, 骶椎后缘点]，保留既有图像方向符号约定。
 */
export function calculateSvaResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 5) return [];
  const c7CenterX =
    points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4;
  const pixelDistance = points[4].x - c7CenterX;
  const distance = calculateActualDistance(Math.abs(pixelDistance), context);

  // 保留既有约定：C7 中心位于骶椎后缘左侧时为正。
  return [
    {
      name: 'SVA',
      value: (pixelDistance > 0 ? distance : -distance).toFixed(2),
      unit: 'mm',
    },
  ];
}

/** SVA 的原始点、C7 中心及中心到骶椎参考点的连线均可命中。 */
export function isSvaInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  if (points.length < 5) return false;
  if (points.some(point => isPointNearPoint(mousePoint, point, tolerance))) {
    return true;
  }
  const c7Center = {
    x: points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4,
    y: points.slice(0, 4).reduce((sum, point) => sum + point.y, 0) / 4,
  };
  return (
    isPointNearPoint(mousePoint, c7Center, tolerance) ||
    isPointNearLine(mousePoint, c7Center, points[4], tolerance)
  );
}
