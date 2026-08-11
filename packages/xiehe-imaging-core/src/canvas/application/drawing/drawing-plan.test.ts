import { describe, expect, it } from 'vitest';

import {
  planDynamicShapeCompletion,
  planSpecialPointToolClick,
  removeClickedPointNear,
} from './drawing-plan';

describe('drawing plans', () => {
  it('normalizes rectangle points and stores a circle as center plus radius point', () => {
    expect(
      planDynamicShapeCompletion('rectangle', { x: 8, y: 9 }, { x: 2, y: 3 })
    ).toEqual({
      type: 'rectangle',
      points: [
        { x: 2, y: 3 },
        { x: 8, y: 9 },
      ],
    });
    expect(
      planDynamicShapeCompletion('circle', { x: 2, y: 2 }, { x: 5, y: 2 })
    ).toEqual({
      type: 'circle',
      points: [
        { x: 2, y: 2 },
        { x: 5, y: 2 },
      ],
    });
  });

  it('closes polygons near the first point and constrains auxiliary lines', () => {
    const polygon = planSpecialPointToolClick({
      toolId: 'polygon',
      clickedPoints: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
      ],
      point: { x: 2, y: 2 },
      imageScale: 1,
    });
    expect(polygon.completion?.points).toHaveLength(3);

    const horizontal = planSpecialPointToolClick({
      toolId: 'aux-horizontal-line',
      clickedPoints: [{ x: 1, y: 3 }],
      point: { x: 8, y: 9 },
      imageScale: 1,
    });
    expect(horizontal.completion?.points[1]).toEqual({ x: 8, y: 3 });
  });

  it('removes only a clicked point within tolerance', () => {
    expect(
      removeClickedPointNear(
        [
          { x: 1, y: 1 },
          { x: 20, y: 20 },
        ],
        { x: 2, y: 2 },
        5
      )
    ).toEqual([{ x: 20, y: 20 }]);
  });
});
