import type { Point } from '@xiehe/imaging-core/contracts';

import type { CircleBounds, CircleGeometry } from './types';

export function createCircleGeometry(
  center: Point,
  radiusHandle: Point
): CircleGeometry {
  return {
    center: { ...center },
    radiusHandle: { ...radiusHandle },
  };
}

export function circleGeometryFromPoints(
  points: readonly Point[],
  centerIndex = 0,
  radiusHandleIndex = 1
): CircleGeometry | null {
  const center = points[centerIndex];
  const radiusHandle = points[radiusHandleIndex];
  return center && radiusHandle
    ? createCircleGeometry(center, radiusHandle)
    : null;
}

export function circleGeometryToPoints(circle: CircleGeometry): [Point, Point] {
  return [{ ...circle.center }, { ...circle.radiusHandle }];
}

export function getCircleRadius(circle: CircleGeometry): number {
  return Math.hypot(
    circle.radiusHandle.x - circle.center.x,
    circle.radiusHandle.y - circle.center.y
  );
}

export function getCircleBounds(
  circle: CircleGeometry,
  padding = 0
): CircleBounds {
  const radius = getCircleRadius(circle);
  return {
    minX: circle.center.x - radius - padding,
    maxX: circle.center.x + radius + padding,
    minY: circle.center.y - radius - padding,
    maxY: circle.center.y + radius + padding,
  };
}

export function translateCircleGeometry(
  circle: CircleGeometry,
  delta: Point
): CircleGeometry {
  return {
    center: {
      x: circle.center.x + delta.x,
      y: circle.center.y + delta.y,
    },
    radiusHandle: {
      x: circle.radiusHandle.x + delta.x,
      y: circle.radiusHandle.y + delta.y,
    },
  };
}

/** 移动圆心时同步移动半径控制点，避免无意改变半径。 */
export function moveCircleCenter(
  circle: CircleGeometry,
  nextCenter: Point
): CircleGeometry {
  return translateCircleGeometry(circle, {
    x: nextCenter.x - circle.center.x,
    y: nextCenter.y - circle.center.y,
  });
}
