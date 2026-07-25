import type { MeasurementResult } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { calculateAngleBetweenVectors } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/geometry';
import { isPointNearLine, isPointNearPoint } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * TPA 点序固定为 [T1四角点, 股骨头中心, S1端点1, S1端点2]。
 * 领域计算先解析 T1 与 S1 中点，再计算两条股骨头中心射线的夹角。
 */
function getTpaGeometry(points: Point[]) {
  if (points.length < 7) return null;
  const t1Center = {
    x: points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4,
    y: points.slice(0, 4).reduce((sum, point) => sum + point.y, 0) / 4,
  };
  const sacralMidpoint = {
    x: (points[5].x + points[6].x) / 2,
    y: (points[5].y + points[6].y) / 2,
  };
  return { t1Center, femoralHeadCenter: points[4], sacralMidpoint };
}

/** 计算股骨头中心指向 T1 中心和 S1 中点两向量的夹角。 */
export function calculateTpaResults(points: Point[]): MeasurementResult[] {
  const geometry = getTpaGeometry(points);
  if (!geometry) return [];
  const toT1 = {
    x: geometry.t1Center.x - geometry.femoralHeadCenter.x,
    y: geometry.t1Center.y - geometry.femoralHeadCenter.y,
  };
  const toSacrum = {
    x: geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x,
    y: geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y,
  };
  const angle = calculateAngleBetweenVectors(toT1, toSacrum);
  return [{ name: 'TPA', value: angle.toFixed(2), unit: '°' }];
}

/** TPA 的原始点、T1 中心及两条股骨头中心射线均可命中。 */
export function isTpaInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  const geometry = getTpaGeometry(points);
  if (!geometry) return false;
  return (
    points.some(point => isPointNearPoint(mousePoint, point, tolerance)) ||
    isPointNearPoint(mousePoint, geometry.t1Center, tolerance) ||
    isPointNearLine(
      mousePoint,
      geometry.femoralHeadCenter,
      geometry.t1Center,
      tolerance
    ) ||
    isPointNearLine(
      mousePoint,
      geometry.femoralHeadCenter,
      geometry.sacralMidpoint,
      tolerance
    )
  );
}
