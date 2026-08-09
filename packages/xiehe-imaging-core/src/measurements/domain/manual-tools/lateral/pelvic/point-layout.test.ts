import { describe, expect, it } from 'vitest';

import {
  createDefaultBilateralPelvicPoints,
  getPelvicMeasurementGeometry,
  moveBilateralPelvicEffectiveCfh,
  resolveEffectiveCfh,
  updatePelvicMeasurementPoint,
} from './index';

describe('lateral pelvic geometry', () => {
  it('keeps the historical three-point CFH layout', () => {
    const geometry = getPelvicMeasurementGeometry([
      { x: 30, y: 40 },
      { x: 10, y: 20 },
      { x: 20, y: 20 },
    ]);

    expect(geometry?.mode).toBe('single');
    expect(geometry?.femoralHeadCenter).toEqual({ x: 30, y: 40 });
  });

  it('uses user placement order for FH-1 and FH-2 without sorting', () => {
    const points = createDefaultBilateralPelvicPoints({
      fh1: { x: 80, y: 100 },
      fh2: { x: 20, y: 100 },
      s1First: { x: 30, y: 40 },
      s1Second: { x: 50, y: 40 },
      imageSize: { width: 1000, height: 500 },
    });
    const geometry = getPelvicMeasurementGeometry(points);

    expect(points[0]).toEqual({ x: 80, y: 100 });
    expect(points[2]).toEqual({ x: 20, y: 100 });
    expect(geometry?.femoralHeadCenter).toEqual({ x: 50, y: 100 });
    expect(geometry?.femoralHeadCircles).toHaveLength(2);
  });

  it('resolves direct and bilateral effective CFH dependencies separately', () => {
    expect(
      resolveEffectiveCfh(new Map([['CFH', { x: 1, y: 2 }]]))
    ).toMatchObject({ status: 'ready', mode: 'single' });
    expect(
      resolveEffectiveCfh(
        new Map([
          ['FH-1', { x: 10, y: 20 }],
          ['FH-2', { x: 30, y: 40 }],
        ])
      )
    ).toMatchObject({
      status: 'ready',
      mode: 'bilateral',
      point: { x: 20, y: 30 },
    });
  });

  it('reports mixed direct and bilateral sources as a conflict', () => {
    expect(
      resolveEffectiveCfh(
        new Map([
          ['CFH', { x: 1, y: 2 }],
          ['FH-1', { x: 10, y: 20 }],
        ])
      )
    ).toEqual({ status: 'conflict' });
  });

  it('translates a bilateral radius handle together with its center', () => {
    const points = createDefaultBilateralPelvicPoints({
      fh1: { x: 10, y: 20 },
      fh2: { x: 40, y: 20 },
      s1First: { x: 20, y: 50 },
      s1Second: { x: 30, y: 50 },
      imageSize: null,
    });

    const moved = updatePelvicMeasurementPoint(points, 0, { x: 15, y: 25 });

    expect(moved[0]).toEqual({ x: 15, y: 25 });
    expect(moved[1]).toEqual({ x: points[1].x + 5, y: points[1].y + 5 });
    expect(moved[2]).toEqual(points[2]);
  });

  it('moves effectiveCFH by translating both circles without moving S1', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 70, y: 40 },
      { x: 70, y: 70 },
      { x: 20, y: 100 },
      { x: 90, y: 110 },
    ];

    const moved = moveBilateralPelvicEffectiveCfh(points, { x: 50, y: 40 });

    expect(moved).toEqual([
      { x: 20, y: 30 },
      { x: 40, y: 30 },
      { x: 80, y: 50 },
      { x: 80, y: 80 },
      { x: 20, y: 100 },
      { x: 90, y: 110 },
    ]);
    expect(getPelvicMeasurementGeometry(moved)?.femoralHeadCenter).toEqual({
      x: 50,
      y: 40,
    });
  });

  it('does not reinterpret historical single-FH points as bilateral circles', () => {
    const points = [
      { x: 30, y: 40 },
      { x: 10, y: 100 },
      { x: 50, y: 100 },
    ];

    expect(moveBilateralPelvicEffectiveCfh(points, { x: 80, y: 90 })).toEqual(
      points
    );
  });
});
