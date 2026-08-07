import type { MeasurementResult } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import {
  calculateAngleBetweenVectors,
  toAcuteAngle,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/geometry';
import { isPointNearLine, isPointNearPoint } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import { getPelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * PI 计算“股骨头中心到 S1 中点连线”与“S1 终板法线”的锐角。
 *
 * 历史/单 FH 点序为 [CFH,S1-1,S1-2]；双 FH 六点布局由 pelvic domain
 * 解析，并使用两个圆心的中点作为 effectiveCFH。
 */
export function calculatePiResults(points: Point[]): MeasurementResult[] {
  if (points.length < 3) return [];
  const geometry = getPelvicMeasurementGeometry(points);
  if (!geometry?.femoralHeadCenter) return [];
  const centerToSacrum = {
    x: geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x,
    y: geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y,
  };
  const angle = toAcuteAngle(
    calculateAngleBetweenVectors(centerToSacrum, geometry.sacralNormal)
  );
  return [{ name: 'PI', value: angle.toFixed(2), unit: '°' }];
}

/** PI 的原始点、S1 终板、终板法线和股骨头连线均可命中。 */
export function isPiInRange(
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
  const normalLength = 80;
  const normalStart = {
    x: geometry.sacralMidpoint.x - geometry.sacralNormal.x * normalLength,
    y: geometry.sacralMidpoint.y - geometry.sacralNormal.y * normalLength,
  };
  const normalEnd = {
    x: geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength,
    y: geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength,
  };
  return (
    isPointNearLine(
      mousePoint,
      geometry.sacralLeft,
      geometry.sacralRight,
      tolerance
    ) ||
    isPointNearLine(mousePoint, normalStart, normalEnd, tolerance) ||
    (geometry.femoralHeadCenter !== null &&
      isPointNearLine(
        mousePoint,
        geometry.femoralHeadCenter,
        geometry.sacralMidpoint,
        tolerance
      ))
  );
}
