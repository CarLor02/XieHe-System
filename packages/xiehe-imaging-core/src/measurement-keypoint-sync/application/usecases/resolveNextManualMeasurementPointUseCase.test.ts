import { describe, expect, test } from 'vitest';

import type { Point } from '../../../shared/domain/contracts';

import { resolveNextManualMeasurementPoint } from './resolveNextManualMeasurementPointUseCase';

const rawPoint = { x: 80, y: 90 };

function resolvePoint({
  toolId,
  pointsNeeded,
  inheritedPoints = new Map<number, Point>(),
  clickedPoints,
}: {
  toolId: string;
  pointsNeeded: number;
  inheritedPoints?: ReadonlyMap<number, Point>;
  clickedPoints: Point[];
}) {
  return resolveNextManualMeasurementPoint({
    toolId,
    pointsNeeded,
    inheritedPoints,
    clickedPoints,
    rawPoint,
  });
}

describe('resolve next manual measurement point', () => {
  test('keeps every TS point free, including the second C7 corner', () => {
    for (let pointIndex = 0; pointIndex < 6; pointIndex += 1) {
      const resolved = resolvePoint({
        toolId: 'ts',
        pointsNeeded: 6,
        clickedPoints: Array.from({ length: pointIndex }, (_, index) => ({
          x: index * 10,
          y: index * 20,
        })),
      });

      expect(resolved).toEqual({
        pointIndex,
        point: rawPoint,
        constraint: { kind: 'free' },
      });
    }
  });

  test('constrains only the second TTS trunk point to the first point', () => {
    const resolved = resolvePoint({
      toolId: 'tts',
      pointsNeeded: 4,
      clickedPoints: [{ x: 10, y: 20 }],
    });

    expect(resolved).toEqual({
      pointIndex: 1,
      point: { x: 80, y: 20 },
      constraint: { kind: 'horizontal', anchorPointIndex: 0 },
    });
  });

  test('does not constrain SR to SL when only SL is inherited', () => {
    const inheritedPoints = new Map<number, Point>([
      [2, { x: 30, y: 40 }],
    ]);
    const resolved = resolvePoint({
      toolId: 'tts',
      pointsNeeded: 4,
      inheritedPoints,
      clickedPoints: [
        { x: 10, y: 20 },
        { x: 50, y: 20 },
      ],
    });

    expect(resolved).toEqual({
      pointIndex: 3,
      point: rawPoint,
      constraint: { kind: 'free' },
    });
  });

  test('keeps tools without placement rules free', () => {
    const resolved = resolvePoint({
      toolId: 'css',
      pointsNeeded: 2,
      clickedPoints: [],
    });

    expect(resolved).toEqual({
      pointIndex: 0,
      point: rawPoint,
      constraint: { kind: 'free' },
    });
  });
});
