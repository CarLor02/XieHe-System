import { describe, expect, it } from 'vitest';

import {
  calculateAngleToHorizontal,
  pointToLineDistance,
} from '../../src/shared/domain/geometry';
import {
  calculateActualDistance,
  calculateCobbResults,
  isCobbInRange,
} from '../../src/measurements';

const calibratedContext = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
  imageNaturalSize: null,
};

describe('shared measurement rules', () => {
  it('normalizes horizontal angles and calibrated distance', () => {
    expect(
      calculateAngleToHorizontal({ x: 10, y: 10 }, { x: 0, y: 0 })
    ).toBeCloseTo(45);
    expect(calculateActualDistance(5, calibratedContext)).toBeCloseTo(50);
    expect(
      pointToLineDistance({ x: 5, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    ).toBeCloseTo(4);
  });

  it('keeps the signed Cobb convention and image-space hit range', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 20 },
      { x: 10, y: 30 },
    ];

    expect(calculateCobbResults(points)[0]).toEqual({
      name: 'Cobb角',
      value: '45.00',
      unit: '°',
    });
    expect(isCobbInRange({ x: 5, y: 1 }, points, 2)).toBe(true);
    expect(isCobbInRange({ x: 50, y: 50 }, points, 2)).toBe(false);
  });
});
