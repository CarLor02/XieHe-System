import { describe, expect, it } from '@jest/globals';

import {
  calculateHemipelvicWidthRatioGeometry,
  createHemipelvicWidthRatioPoints,
  getHemipelvicVerticalLines,
  moveHemipelvicVerticalLine,
  updateHemipelvicInteractivePoint,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

const unorderedAnchors = [
  { x: 300, y: 20 },
  { x: 100, y: 10 },
  { x: 400, y: 40 },
  { x: 200, y: 30 },
];

describe('hemipelvic width ratio geometry', () => {
  it('stores four anchors separately from eight interaction endpoints', () => {
    const points = createHemipelvicWidthRatioPoints(unorderedAnchors);

    expect(points).toHaveLength(12);
    expect(points.slice(0, 4)).toEqual(unorderedAnchors);
    expect(points.slice(4, 6)).toEqual([
      { x: 300, y: -20 },
      { x: 300, y: 60 },
    ]);
    expect(getHemipelvicVerticalLines(points)).toHaveLength(4);
  });

  it('sorts by horizontal position without rewriting source groups', () => {
    const points = createHemipelvicWidthRatioPoints(unorderedAnchors);
    const geometry = calculateHemipelvicWidthRatioGeometry(points);

    expect(geometry?.lines.map(line => line.sourceIndex)).toEqual([1, 3, 0, 2]);
    expect(geometry?.lines.map(line => line.label)).toEqual([
      '左外缘（ASIS）',
      '左内缘（SI）',
      '右内缘（SI）',
      '右外缘（ASIS）',
    ]);
    expect(geometry?.dLPixels).toBe(100);
    expect(geometry?.dRPixels).toBe(100);
    expect(geometry?.ratio).toBe(1);
    expect(points.slice(0, 4)).toEqual(unorderedAnchors);
  });

  it('uses the source index as a stable tie breaker', () => {
    const points = createHemipelvicWidthRatioPoints([
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ]);

    expect(calculateHemipelWidthRatioSourceIndices(points)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('moves an anchor together with its paired line endpoints', () => {
    const points = createHemipelvicWidthRatioPoints(unorderedAnchors);
    const updated = updateHemipelvicInteractivePoint(points, 0, {
      x: 320,
      y: 50,
    });

    expect(updated[0]).toEqual({ x: 320, y: 50 });
    expect(updated[4]).toEqual({ x: 320, y: 10 });
    expect(updated[5]).toEqual({ x: 320, y: 90 });
    expect(updated[1]).toEqual(points[1]);
  });

  it('locks endpoint x and keeps the line segment across its anchor', () => {
    const points = createHemipelvicWidthRatioPoints(unorderedAnchors);
    const topPastAnchor = updateHemipelvicInteractivePoint(points, 4, {
      x: 999,
      y: 100,
    });
    const bottomPastAnchor = updateHemipelvicInteractivePoint(points, 5, {
      x: 999,
      y: -100,
    });

    expect(topPastAnchor[4]).toEqual({ x: 300, y: 20 });
    expect(bottomPastAnchor[5]).toEqual({ x: 300, y: 20 });
  });

  it('moves a line horizontally while preserving all y coordinates', () => {
    const points = createHemipelvicWidthRatioPoints(unorderedAnchors);
    const updated = moveHemipelvicVerticalLine(points, 2, 450);

    expect(updated[2]).toEqual({ x: 450, y: 40 });
    expect(updated[8]).toEqual({ x: 450, y: 0 });
    expect(updated[9]).toEqual({ x: 450, y: 80 });
  });

  it('returns an unavailable ratio when the right distance is zero', () => {
    const points = createHemipelvicWidthRatioPoints([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ]);

    expect(calculateHemipelvicWidthRatioGeometry(points)?.ratio).toBeNull();
  });
});

function calculateHemipelWidthRatioSourceIndices(
  points: { x: number; y: number }[]
) {
  return calculateHemipelvicWidthRatioGeometry(points)?.lines.map(
    line => line.sourceIndex
  );
}
