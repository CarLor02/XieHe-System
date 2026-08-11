import { describe, expect, it } from 'vitest';

import { AVT_CONFIG } from './avt';

describe('AVT measurement config', () => {
  it('positions the label beside the apex vertebra instead of the shared sacral points', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 140, y: 110 },
      { x: 105, y: 140 },
      { x: 145, y: 150 },
      { x: 400, y: 700 },
      { x: 420, y: 710 },
    ];

    expect(AVT_CONFIG.getLabelPosition?.(points, 1)).toEqual({
      x: 145,
      y: 125,
    });
  });

  it('keeps the label on the apex center for historical two-point AVT data', () => {
    const apexCenter = { x: 120, y: 200 };
    const csvlReference = { x: 500, y: 800 };

    expect(
      AVT_CONFIG.getLabelPosition?.([apexCenter, csvlReference], 1)
    ).toEqual(apexCenter);
  });
});
