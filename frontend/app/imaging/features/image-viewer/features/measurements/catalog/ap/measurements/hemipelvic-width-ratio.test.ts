import { describe, expect, it } from '@jest/globals';

import { HEMIPELVIC_WIDTH_RATIO_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/hemipelvic-width-ratio';
import { createHemipelvicWidthRatioPoints } from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

describe('L/R measurement config', () => {
  it('defines the AP manual tool metadata', () => {
    expect(HEMIPELVIC_WIDTH_RATIO_CONFIG).toMatchObject({
      id: 'hemipelvic-width-ratio',
      name: 'L/R',
      description: '半骨盆宽度比(L/R)',
      pointsNeeded: 4,
      category: 'measurement',
    });
  });

  it('calculates a dimensionless ratio and handles a zero right width', () => {
    const context = {
      standardDistance: null,
      standardDistancePoints: [],
      imageNaturalSize: { width: 1000, height: 1000 },
    };
    const ratioPoints = createHemipelvicWidthRatioPoints([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 50, y: 0 },
      { x: 60, y: 0 },
    ]);
    const zeroRightPoints = createHemipelvicWidthRatioPoints([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 10 },
    ]);

    expect(
      HEMIPELVIC_WIDTH_RATIO_CONFIG.calculateResults(ratioPoints, context)
    ).toEqual([{ name: 'L/R', value: '2.00', unit: '' }]);
    expect(
      HEMIPELVIC_WIDTH_RATIO_CONFIG.calculateResults(zeroRightPoints, context)
    ).toEqual([{ name: 'L/R', value: '--', unit: '' }]);
  });
});
