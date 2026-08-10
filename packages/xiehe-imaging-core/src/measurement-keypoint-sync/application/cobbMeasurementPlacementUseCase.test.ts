import { describe, expect, it } from 'vitest';

import type { KeypointAnnotation } from '../../keypoints';
import { AnnotationSource } from '../../shared/domain/contracts';
import {
  assembleLateralCobbPlacementPoints,
  getLateralCobbPlacementPointIds,
} from '../../measurements/domain/manual-tools/lateral';

import {
  getLateralCobbPlacementInheritedPointMap,
  getNextLateralCobbPlacementPointIndex,
} from './cobbMeasurementPlacementUseCase';

function keypoint(id: string, x: number): KeypointAnnotation {
  return {
    id,
    point: { x, y: x },
    source: AnnotationSource.AI,
    confidence: 0.9,
  };
}

describe('lateral Cobb measurement placement', () => {
  it('inherits available known endpoint points and requests only missing slots', () => {
    const session = {
      toolId: 'lateral-cobb' as const,
      upperVertebra: 'T2',
      lowerVertebra: 'T4',
    };
    const inherited = getLateralCobbPlacementInheritedPointMap({
      session,
      keypoints: [keypoint('T2-1', 1), keypoint('T4-4', 4)],
    });

    expect(Array.from(inherited.keys())).toEqual([0, 3]);
    expect(getNextLateralCobbPlacementPointIndex(inherited, 0)).toBe(1);
    expect(getNextLateralCobbPlacementPointIndex(inherited, 1)).toBe(2);
    expect(getNextLateralCobbPlacementPointIndex(inherited, 2)).toBeNull();
    expect(
      assembleLateralCobbPlacementPoints(inherited, [
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ])
    ).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
  });

  it('keeps pending endpoint slots unbound and uses S1 upper endplate points', () => {
    expect(
      getLateralCobbPlacementPointIds({
        upperVertebra: null,
        lowerVertebra: 'S1',
      })
    ).toEqual([null, null, 'S1-1', 'S1-2']);
  });
});
