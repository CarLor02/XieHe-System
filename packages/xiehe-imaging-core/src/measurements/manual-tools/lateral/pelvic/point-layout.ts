import {
  circleGeometryFromPoints,
  circleGeometryToPoints,
  createCircleGeometry,
  moveCircleCenter,
} from '../../../../geometry';
import type { CircleGeometry } from '../../../../geometry';
import type { Point } from '../../../../contracts';

import type { PelvicMeasurementMetadata } from '../../../../contracts';
import type { PelvicMeasurementGeometry } from './types';

export const SINGLE_PELVIC_POINT_COUNT = 3;
export const BILATERAL_PELVIC_POINT_COUNT = 6;

export const BILATERAL_PELVIC_POINT_LABELS = [
  'FH-1圆心',
  'FH-1半径点',
  'FH-2圆心',
  'FH-2半径点',
  'S1-1',
  'S1-2',
] as const;

export function createPelvicMeasurementMetadata(
  femoralHeadMode: PelvicMeasurementMetadata['femoralHeadMode']
): PelvicMeasurementMetadata {
  return { schemaVersion: 2, femoralHeadMode };
}

export function isPelvicMeasurementMetadata(
  value: unknown
): value is PelvicMeasurementMetadata {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<PelvicMeasurementMetadata>;
  return (
    metadata.schemaVersion === 2 &&
    (metadata.femoralHeadMode === 'single' ||
      metadata.femoralHeadMode === 'bilateral')
  );
}

export function getDefaultFemoralHeadRadius(
  imageSize: { width: number; height: number } | null
): number {
  const shortestSide = imageSize
    ? Math.min(imageSize.width, imageSize.height)
    : 0;
  return shortestSide > 0 ? Math.max(1, shortestSide * 0.03) : 20;
}

export function createDefaultBilateralPelvicPoints({
  fh1,
  fh2,
  s1First,
  s1Second,
  imageSize,
}: {
  fh1: Point;
  fh2: Point;
  s1First: Point;
  s1Second: Point;
  imageSize: { width: number; height: number } | null;
}): Point[] {
  const radius = getDefaultFemoralHeadRadius(imageSize);
  return [
    { ...fh1 },
    { x: fh1.x + radius, y: fh1.y },
    { ...fh2 },
    { x: fh2.x + radius, y: fh2.y },
    { ...s1First },
    { ...s1Second },
  ];
}

/**
 * 解析 PI/PT/SS 的领域几何。
 *
 * 历史 PI/PT 没有 metadata，且固定保存为 [CFH,S1-1,S1-2]；该三点
 * 分支必须永久保留，不能按新六点布局重排。新双 FH 严格使用用户落点顺序
 * [FH-1圆心,FH-1半径点,FH-2圆心,FH-2半径点,S1-1,S1-2]，不按 X 排序。
 */
export function getPelvicMeasurementGeometry(
  points: Point[]
): PelvicMeasurementGeometry | null {
  let femoralHeadCenter: Point | null = null;
  let femoralHeadCircles: CircleGeometry[] = [];
  let sacralLeft: Point;
  let sacralRight: Point;
  let mode: PelvicMeasurementGeometry['mode'];

  if (points.length === BILATERAL_PELVIC_POINT_COUNT) {
    const firstCircle = circleGeometryFromPoints(points, 0, 1);
    const secondCircle = circleGeometryFromPoints(points, 2, 3);
    if (!firstCircle || !secondCircle) return null;
    femoralHeadCircles = [firstCircle, secondCircle];
    femoralHeadCenter = {
      x: (firstCircle.center.x + secondCircle.center.x) / 2,
      y: (firstCircle.center.y + secondCircle.center.y) / 2,
    };
    sacralLeft = points[4];
    sacralRight = points[5];
    mode = 'bilateral';
  } else if (points.length >= SINGLE_PELVIC_POINT_COUNT) {
    femoralHeadCenter = points[0];
    sacralLeft = points[1];
    sacralRight = points[2];
    mode = 'single';
  } else if (points.length === 2) {
    sacralLeft = points[0];
    sacralRight = points[1];
    mode = 'sacral-only';
  } else {
    return null;
  }

  const dx = sacralRight.x - sacralLeft.x;
  const dy = sacralRight.y - sacralLeft.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  return {
    mode,
    femoralHeadCenter,
    femoralHeadCircles,
    sacralLeft,
    sacralRight,
    sacralMidpoint: {
      x: (sacralLeft.x + sacralRight.x) / 2,
      y: (sacralLeft.y + sacralRight.y) / 2,
    },
    sacralNormal: {
      x: -dy / length,
      y: dx / length,
    },
  };
}

/**
 * 更新 PI/PT 的交互点。双 FH 模式移动圆心时，半径控制点必须同步平移；
 * 移动半径控制点则只改变对应圆的半径。
 */
export function updatePelvicMeasurementPoint(
  points: Point[],
  pointIndex: number,
  nextPoint: Point
): Point[] {
  const nextPoints = points.map(point => ({ ...point }));
  if (points.length !== BILATERAL_PELVIC_POINT_COUNT) {
    if (nextPoints[pointIndex]) nextPoints[pointIndex] = { ...nextPoint };
    return nextPoints;
  }

  if (pointIndex === 0 || pointIndex === 2) {
    const handleIndex = pointIndex + 1;
    const movedCircle = moveCircleCenter(
      createCircleGeometry(points[pointIndex], points[handleIndex]),
      nextPoint
    );
    nextPoints[pointIndex] = movedCircle.center;
    nextPoints[handleIndex] = movedCircle.radiusHandle;
    return nextPoints;
  }

  if (nextPoints[pointIndex]) nextPoints[pointIndex] = { ...nextPoint };
  return nextPoints;
}

/**
 * 将双 FH 的派生中心 effectiveCFH 移动到指定位置。
 *
 * effectiveCFH 不单独持久化，它始终是 FH-1/FH-2 两个圆心的中点。拖动该
 * 交互句柄时，通过同一位移平移两个圆心及各自半径控制点，从而保持圆心间距、
 * 圆半径和 S1 终板不变。历史单 FH/非六点数据不适用该交互，原样克隆返回。
 */
export function moveBilateralPelvicEffectiveCfh(
  points: Point[],
  nextEffectiveCfh: Point
): Point[] {
  const geometry = getPelvicMeasurementGeometry(points);
  if (
    geometry?.mode !== 'bilateral' ||
    !geometry.femoralHeadCenter ||
    geometry.femoralHeadCircles.length !== 2
  ) {
    return points.map(point => ({ ...point }));
  }

  const delta = {
    x: nextEffectiveCfh.x - geometry.femoralHeadCenter.x,
    y: nextEffectiveCfh.y - geometry.femoralHeadCenter.y,
  };
  const movedCircles = geometry.femoralHeadCircles.flatMap(circle =>
    circleGeometryToPoints(
      moveCircleCenter(circle, {
        x: circle.center.x + delta.x,
        y: circle.center.y + delta.y,
      })
    )
  );

  return [
    ...movedCircles,
    { ...geometry.sacralLeft },
    { ...geometry.sacralRight },
  ];
}

export function createCircleFromPelvicPoints(
  points: Point[],
  circleIndex: 0 | 1
) {
  const centerIndex = circleIndex === 0 ? 0 : 2;
  return createCircleGeometry(points[centerIndex], points[centerIndex + 1]);
}
