import { describe, expect, test } from '@jest/globals';

import {
  getEffectivePointsNeeded,
  getManualMeasurementInheritedPointMap,
  getNextManualMeasurementPointIndex,
} from './annotationInheritanceUseCase';

describe('manual measurement point inheritance', () => {
  test('requires a full redraw when every CSS point can be inherited', () => {
    const measurements = [
      {
        type: 'ts',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 10, y: 20 },
          { x: 20, y: 20 },
          { x: 100, y: 200 },
          { x: 220, y: 210 },
        ],
      },
    ];

    expect(
      getManualMeasurementInheritedPointMap('css', 2, measurements).size
    ).toBe(0);
    expect(getEffectivePointsNeeded('css', 2, measurements)).toBe(2);
    expect(
      getNextManualMeasurementPointIndex('css', measurements, 2, 0)
    ).toBe(0);
  });

  test('keeps partial inheritance and only asks for the missing PI point', () => {
    const measurements = [
      {
        type: 'ss',
        points: [
          { x: 100, y: 220 },
          { x: 220, y: 210 },
        ],
      },
    ];

    expect(
      Array.from(
        getManualMeasurementInheritedPointMap('pi', 3, measurements).keys()
      )
    ).toEqual([1, 2]);
    expect(getEffectivePointsNeeded('pi', 3, measurements)).toBe(1);
    expect(
      getNextManualMeasurementPointIndex('pi', measurements, 3, 0)
    ).toBe(0);
  });
});
