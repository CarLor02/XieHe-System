import { describe, expect, it } from 'vitest';

import { getVertebraCenterGeometry } from './vertebra-center';

describe('getVertebraCenterGeometry', () => {
  it('returns perimeter, edge-midpoint lines and their intersection', () => {
    const topLeft = { x: 0, y: 0 };
    const topRight = { x: 8, y: 2 };
    const bottomLeft = { x: 2, y: 10 };
    const bottomRight = { x: 14, y: 8 };

    const geometry = getVertebraCenterGeometry([
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    ]);

    expect(geometry.perimeter).toEqual([
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    ]);
    expect(geometry.topMidpoint).toEqual({ x: 4, y: 1 });
    expect(geometry.bottomMidpoint).toEqual({ x: 8, y: 9 });
    expect(geometry.leftMidpoint).toEqual({ x: 1, y: 5 });
    expect(geometry.rightMidpoint).toEqual({ x: 11, y: 5 });
    expect(geometry.topBottomMidline).toEqual([
      { x: 4, y: 1 },
      { x: 8, y: 9 },
    ]);
    expect(geometry.leftRightMidline).toEqual([
      { x: 1, y: 5 },
      { x: 11, y: 5 },
    ]);
    expect(geometry.center).toEqual({ x: 6, y: 5 });
  });
});
