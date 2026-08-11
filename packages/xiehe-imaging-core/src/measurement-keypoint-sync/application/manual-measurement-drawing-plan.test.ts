import { describe, expect, it } from 'vitest';

import { planManualMeasurementPointClick } from './manual-measurement-drawing-plan';

describe('manual measurement drawing plan', () => {
  it('inherits existing points and completes after only missing points are clicked', () => {
    const inherited = new Map([
      [0, { x: 1, y: 1 }],
      [1, { x: 2, y: 1 }],
    ]);
    const first = planManualMeasurementPointClick({
      toolId: 'cobb',
      pointsNeeded: 4,
      inheritedPoints: inherited,
      clickedPoints: [],
      rawPoint: { x: 3, y: 4 },
    });
    expect(first.completedPoints).toBeNull();

    const second = planManualMeasurementPointClick({
      toolId: 'cobb',
      pointsNeeded: 4,
      inheritedPoints: inherited,
      clickedPoints: first.clickedPoints,
      rawPoint: { x: 5, y: 4 },
    });
    expect(second.completedPoints).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 4 },
      { x: 5, y: 4 },
    ]);
  });

  it('opens and clears the correct reference line around completion', () => {
    const first = planManualMeasurementPointClick({
      toolId: 'ca',
      pointsNeeded: 2,
      inheritedPoints: new Map(),
      clickedPoints: [],
      rawPoint: { x: 1, y: 2 },
    });
    expect(first.referenceLineUpdate).toEqual({
      key: 'ca',
      point: { x: 1, y: 2 },
    });

    const second = planManualMeasurementPointClick({
      toolId: 'ca',
      pointsNeeded: 2,
      inheritedPoints: new Map(),
      clickedPoints: first.clickedPoints,
      rawPoint: { x: 5, y: 6 },
    });
    expect(second.referenceLineUpdate).toEqual({ key: 'ca', point: null });
    expect(second.completedPoints).toHaveLength(2);
  });

  it('does not apply a horizontal constraint to TTS sacral points', () => {
    const inherited = new Map([
      [0, { x: 10, y: 10 }],
      [1, { x: 20, y: 10 }],
    ]);
    const first = planManualMeasurementPointClick({
      toolId: 'tts',
      pointsNeeded: 4,
      inheritedPoints: inherited,
      clickedPoints: [],
      rawPoint: { x: 30, y: 50 },
    });
    expect(first.clickedPoints[0]).toEqual({ x: 30, y: 50 });
  });
});
