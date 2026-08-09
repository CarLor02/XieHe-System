import { describe, expect, it } from 'vitest';

import {
  calculatePinchViewport,
  getPointerDistance,
  getPointerMidpoint,
} from './pinch-zoom';

describe('pinch zoom geometry', () => {
  it('calculates distance and midpoint', () => {
    expect(getPointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(getPointerMidpoint({ x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({
      x: 20,
      y: 40,
    });
  });

  it('zooms around the moving pinch midpoint', () => {
    const viewport = calculatePinchViewport(
      {
        distance: 100,
        midpoint: { x: 100, y: 100 },
        imageScale: 1,
        imagePosition: { x: 0, y: 0 },
        containerCenter: { x: 200, y: 150 },
      },
      { x: 70, y: 100 },
      { x: 270, y: 100 }
    );

    expect(viewport.imageScale).toBe(2);
    expect(viewport.imagePosition).toEqual({ x: 170, y: 50 });
  });

  it('clamps scale while preserving the pinch anchor', () => {
    const viewport = calculatePinchViewport(
      {
        distance: 10,
        midpoint: { x: 50, y: 50 },
        imageScale: 1,
        imagePosition: { x: 10, y: -10 },
        containerCenter: { x: 50, y: 50 },
      },
      { x: -100, y: 50 },
      { x: 200, y: 50 }
    );

    expect(viewport.imageScale).toBe(5);
    expect(viewport.imagePosition).toEqual({ x: 50, y: -50 });
  });
});
