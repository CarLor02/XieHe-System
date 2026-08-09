import type { MeasurementResult } from '../../../shared-rules';
import {
  isPointNearLine,
  isPointNearPoint,
} from '../../../../geometry';
import { getPelvicMeasurementGeometry } from '../pelvic';
import type { PelvicMeasurementGeometry } from '../pelvic';
import type { Point } from '../../../../contracts';

/**
 * PT 计算股骨头中心到 S1 中点连线相对垂线的有符号角。
 *
 * 历史/单 FH 点序为 [CFH,S1-1,S1-2]；双 FH 六点布局由 pelvic domain
 * 解析，并使用两个圆心的中点作为 effectiveCFH。水平偏移方向决定正负。
 */
export function calculatePtResults(points: Point[]): MeasurementResult[] {
  if (points.length < 3) return [];
  const geometry = getPelvicMeasurementGeometry(points);
  return geometry ? calculatePtResultsFromGeometry(geometry) : [];
}

export function calculatePtResultsFromGeometry(
  geometry: PelvicMeasurementGeometry
): MeasurementResult[] {
  if (!geometry.femoralHeadCenter) return [];
  const dx = geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x;
  const dy = geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y;
  const magnitude = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
  return [
    {
      name: 'PT',
      value: (dx < 0 ? -magnitude : magnitude).toFixed(2),
      unit: '°',
    },
  ];
}

/** PT 的原始点、S1 终板、垂直参考线和股骨头连线均可命中。 */
export function isPtInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  const geometry = getPelvicMeasurementGeometry(points);
  if (!geometry) return false;
  if (
    points.some(point => isPointNearPoint(mousePoint, point, tolerance)) ||
    isPointNearPoint(mousePoint, geometry.sacralMidpoint, tolerance)
  ) {
    return true;
  }
  const isNearSacralLine = isPointNearLine(
    mousePoint,
    geometry.sacralLeft,
    geometry.sacralRight,
    tolerance
  );
  if (!geometry.femoralHeadCenter) return isNearSacralLine;
  const verticalTop = {
    x: geometry.femoralHeadCenter.x,
    y: geometry.femoralHeadCenter.y - 80,
  };
  const verticalBottom = {
    x: geometry.femoralHeadCenter.x,
    y: geometry.femoralHeadCenter.y + 80,
  };
  return (
    isNearSacralLine ||
    isPointNearLine(mousePoint, verticalTop, verticalBottom, tolerance) ||
    isPointNearLine(
      mousePoint,
      geometry.femoralHeadCenter,
      geometry.sacralMidpoint,
      tolerance
    )
  );
}
