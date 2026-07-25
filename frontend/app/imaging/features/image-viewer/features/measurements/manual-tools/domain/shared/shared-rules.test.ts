import { describe, expect, it } from '@jest/globals';

import { calculateActualDistance } from './calibration';
import { calculateCobbResults, isCobbInRange } from './cobb';
import {
  calculateAngleToHorizontal,
  pointToLineDistance,
} from './geometry';
import { getPelvicMeasurementGeometry } from './pelvic';

const calibratedContext = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
  imageNaturalSize: null,
};

describe('manual tool shared domain rules', () => {
  it('normalizes horizontal angles and calibrated distance', () => {
    expect(calculateAngleToHorizontal({ x: 10, y: 10 }, { x: 0, y: 0 }))
      .toBeCloseTo(45);
    expect(calculateActualDistance(5, calibratedContext)).toBeCloseTo(50);
    expect(
      pointToLineDistance(
        { x: 5, y: 4 },
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      )
    ).toBeCloseTo(4);
  });

  it('keeps the existing signed Cobb convention and hit range', () => {
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

  it('builds pelvic midpoint and normal from the shared point layout', () => {
    const geometry = getPelvicMeasurementGeometry([
      { x: 10, y: 10 },
      { x: -5, y: 0 },
      { x: 5, y: 0 },
    ]);
    expect(geometry).toEqual({
      femoralHeadCenter: { x: 10, y: 10 },
      sacralLeft: { x: -5, y: 0 },
      sacralRight: { x: 5, y: 0 },
      sacralMidpoint: { x: 0, y: 0 },
      sacralNormal: { x: -0, y: 1 },
    });
  });
});
