import { describe, expect, it } from 'vitest';

import type { KeypointAnnotation } from '../../keypoints';
import { AnnotationSource } from '../../shared/domain/contracts';

import {
  getNextPelvicPlacementPointIndex,
  getPelvicPlacementInheritedPointMap,
} from './pelvicMeasurementPlacementUseCase';

function keypoint(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.MANUAL,
    confidence: 1,
  };
}

describe('pelvic measurement placement', () => {
  it('inherits bilateral PI geometry when placing TPA and only requests T1 points', () => {
    const inherited = getPelvicPlacementInheritedPointMap({
      toolId: 'tpa',
      mode: 'bilateral',
      keypoints: [
        keypoint('FH-1', 10, 20),
        keypoint('FH-2', 50, 20),
        keypoint('S1-1', 20, 100),
        keypoint('S1-2', 80, 100),
      ],
      measurements: [
        {
          id: 'pi-bilateral',
          type: 'PI',
          value: '20.00°',
          points: [
            { x: 10, y: 20 },
            { x: 25, y: 20 },
            { x: 50, y: 20 },
            { x: 70, y: 20 },
            { x: 20, y: 100 },
            { x: 80, y: 100 },
          ],
          pelvicMetadata: {
            schemaVersion: 2,
            femoralHeadMode: 'bilateral',
          },
        },
      ],
    });

    expect(Array.from(inherited.keys()).sort((a, b) => a - b)).toEqual([
      4, 5, 6, 7, 8, 9,
    ]);
    expect(inherited.get(5)).toEqual({ x: 25, y: 20 });
    expect(inherited.get(7)).toEqual({ x: 70, y: 20 });
    expect(
      getNextPelvicPlacementPointIndex('tpa', 'bilateral', inherited, 0)
    ).toBe(0);
    expect(
      getNextPelvicPlacementPointIndex('tpa', 'bilateral', inherited, 3)
    ).toBe(3);
  });

  it('requests the full ten-point contract for bilateral TPA without dependencies', () => {
    const inherited = getPelvicPlacementInheritedPointMap({
      toolId: 'tpa',
      mode: 'bilateral',
      keypoints: [],
      measurements: [],
    });

    expect(inherited.size).toBe(0);
    expect(
      getNextPelvicPlacementPointIndex('tpa', 'bilateral', inherited, 9)
    ).toBe(9);
    expect(
      getNextPelvicPlacementPointIndex('tpa', 'bilateral', inherited, 10)
    ).toBeNull();
  });
});
