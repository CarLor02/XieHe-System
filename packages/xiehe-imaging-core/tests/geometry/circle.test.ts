import { describe, expect, it } from 'vitest';

import {
  circleGeometryFromPoints,
  circleGeometryToPoints,
  createCircleGeometry,
  getCircleRadius,
  moveCircleCenter,
} from '../../src/shared/domain/geometry/circle';

describe('CircleGeometry', () => {
  it('uses center and radius handle as the stable two-point circle contract', () => {
    const circle = createCircleGeometry({ x: 10, y: 20 }, { x: 13, y: 24 });

    expect(getCircleRadius(circle)).toBe(5);
    expect(circleGeometryToPoints(circle)).toEqual([
      { x: 10, y: 20 },
      { x: 13, y: 24 },
    ]);
  });

  it('moves the radius handle together with the center', () => {
    const circle = createCircleGeometry({ x: 10, y: 20 }, { x: 15, y: 20 });

    expect(moveCircleCenter(circle, { x: 30, y: 40 })).toEqual({
      center: { x: 30, y: 40 },
      radiusHandle: { x: 35, y: 40 },
    });
  });

  it('reads circles from arbitrary point slots without mutating source points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 5, y: 5 },
      { x: 9, y: 5 },
    ];
    const circle = circleGeometryFromPoints(points, 2, 3);

    expect(circle).toEqual({
      center: { x: 5, y: 5 },
      radiusHandle: { x: 9, y: 5 },
    });
    expect(circle?.center).not.toBe(points[2]);
  });
});
