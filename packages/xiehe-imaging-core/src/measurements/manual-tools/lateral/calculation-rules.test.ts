import { describe, expect, it } from 'vitest';

import { calculatePiResults } from './pi';
import { calculatePtResults } from './pt';
import { calculateSsResults } from './ss';
import { calculateSvaResults } from './sva';
import { calculateT1SlopeResults } from './t1-slope';
import { calculateTpaResults } from './tpa';

const context = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
  imageNaturalSize: null,
};

describe('lateral manual tool calculations', () => {
  it('uses the clinical T1 Slope sign while SS remains absolute', () => {
    const descendingLine = [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ];
    const posteriorTilt = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];

    expect(calculateT1SlopeResults(descendingLine)[0].value).toBe('45.00');
    expect(calculateT1SlopeResults(posteriorTilt)[0].value).toBe('-45.00');
    expect(calculateSsResults(descendingLine)[0].value).toBe('45.00');
  });

  it('preserves SVA sign convention', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 15, y: 20 },
    ];
    expect(calculateSvaResults(points, context)[0].value).toBe('100.00');
  });

  it('calculates PI, PT and TPA from shared pelvic geometry', () => {
    const pelvicPoints = [
      { x: 10, y: 10 },
      { x: -5, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(calculatePiResults(pelvicPoints)[0].value).toBe('45.00');
    expect(calculatePtResults(pelvicPoints)[0].value).toBe('-45.00');

    const tpaPoints = [
      { x: -1, y: -11 },
      { x: 1, y: -11 },
      { x: -1, y: -9 },
      { x: 1, y: -9 },
      { x: 0, y: 0 },
      { x: 9, y: 0 },
      { x: 11, y: 0 },
    ];
    expect(calculateTpaResults(tpaPoints)[0].value).toBe('90.00');

    const bilateralTpaPoints = [
      ...tpaPoints.slice(0, 4),
      { x: -5, y: 0 },
      { x: -3, y: 0 },
      { x: 5, y: 0 },
      { x: 8, y: 0 },
      { x: 9, y: 0 },
      { x: 11, y: 0 },
    ];
    expect(calculateTpaResults(bilateralTpaPoints)[0].value).toBe('90.00');
  });
});
