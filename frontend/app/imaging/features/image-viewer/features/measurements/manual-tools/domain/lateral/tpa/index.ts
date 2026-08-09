import type { MeasurementResult } from '@xiehe/imaging-core/measurements';
import { calculateAngleBetweenVectors } from '@xiehe/imaging-core/geometry';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@xiehe/imaging-core/geometry';
import {
  extractBilateralPelvicPoints,
  getPelvicMeasurementGeometry,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { PelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * 单 FH 与无 metadata 的历史 TPA 固定为七点
 * [T1四角点,CFH,S1-1,S1-2]。新双 FH TPA 固定为十点
 * [T1四角点,FH-1圆心/半径点,FH-2圆心/半径点,S1-1,S1-2]。
 */
export function getTpaGeometry(points: Point[]) {
  if (points.length < 7) return null;
  const t1Center = {
    x: points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4,
    y: points.slice(0, 4).reduce((sum, point) => sum + point.y, 0) / 4,
  };
  const bilateralPelvicPoints = extractBilateralPelvicPoints('tpa', points);
  if (bilateralPelvicPoints) {
    const pelvicGeometry = getPelvicMeasurementGeometry(bilateralPelvicPoints);
    if (!pelvicGeometry?.femoralHeadCenter) return null;
    return {
      t1Center,
      femoralHeadCenter: pelvicGeometry.femoralHeadCenter,
      sacralMidpoint: pelvicGeometry.sacralMidpoint,
      pelvicPoints: bilateralPelvicPoints,
    };
  }

  const sacralMidpoint = {
    x: (points[5].x + points[6].x) / 2,
    y: (points[5].y + points[6].y) / 2,
  };
  return {
    t1Center,
    femoralHeadCenter: points[4],
    sacralMidpoint,
    pelvicPoints: points.slice(4, 7),
  };
}

/** 计算股骨头中心指向 T1 中心和 S1 中点两向量的夹角。 */
export function calculateTpaResults(points: Point[]): MeasurementResult[] {
  const geometry = getTpaGeometry(points);
  if (!geometry) return [];
  const pelvicGeometry = getPelvicMeasurementGeometry(geometry.pelvicPoints);
  return pelvicGeometry
    ? calculateTpaResultsFromGeometry(geometry.t1Center, pelvicGeometry)
    : [];
}

export function calculateTpaResultsFromGeometry(
  t1Center: Point,
  pelvicGeometry: PelvicMeasurementGeometry
): MeasurementResult[] {
  if (!pelvicGeometry.femoralHeadCenter) return [];
  const toT1 = {
    x: t1Center.x - pelvicGeometry.femoralHeadCenter.x,
    y: t1Center.y - pelvicGeometry.femoralHeadCenter.y,
  };
  const toSacrum = {
    x: pelvicGeometry.sacralMidpoint.x - pelvicGeometry.femoralHeadCenter.x,
    y: pelvicGeometry.sacralMidpoint.y - pelvicGeometry.femoralHeadCenter.y,
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
