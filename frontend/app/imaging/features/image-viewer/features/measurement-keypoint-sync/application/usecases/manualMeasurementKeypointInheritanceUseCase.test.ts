import { describe, expect, test } from '@jest/globals';

import { AnnotationSource } from '@xiehe/imaging-core/contracts';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';

import {
  getEffectiveManualMeasurementPointsNeeded,
  getManualMeasurementInheritedPointMap,
  getNextManualMeasurementPointIndex,
} from './manualMeasurementKeypointInheritanceUseCase';

function keypoint(id: string, x: number): KeypointAnnotation {
  return {
    id,
    point: { x, y: x + 1 },
    source: AnnotationSource.MANUAL,
    confidence: 1,
  };
}

describe('manual measurement keypoint inheritance', () => {
  test('inherits PI slots and only asks for the missing S1-2 point', () => {
    const keypoints = [keypoint('CFH', 10), keypoint('S1-1', 20)];
    const inherited = getManualMeasurementInheritedPointMap(
      'pi',
      3,
      keypoints
    );

    expect(Array.from(inherited.keys())).toEqual([0, 1]);
    expect(getEffectiveManualMeasurementPointsNeeded('pi', 3, keypoints)).toBe(
      1
    );
    expect(getNextManualMeasurementPointIndex('pi', keypoints, 3, 0)).toBe(2);
  });

  test('inherits four C7 points for SVA and asks for S1-2', () => {
    const keypoints = [1, 2, 3, 4].map(index =>
      keypoint(`C7-${index}`, index * 10)
    );

    expect(
      Array.from(
        getManualMeasurementInheritedPointMap('sva', 5, keypoints).keys()
      )
    ).toEqual([0, 1, 2, 3]);
    expect(getNextManualMeasurementPointIndex('sva', keypoints, 5, 0)).toBe(4);
  });

  test('keeps complete CSS keypoints available for zero-click restoration', () => {
    const keypoints = [keypoint('SL', 10), keypoint('SR', 20)];

    expect(
      getManualMeasurementInheritedPointMap('css', 2, keypoints).size
    ).toBe(2);
    expect(
      getEffectiveManualMeasurementPointsNeeded('css', 2, keypoints)
    ).toBe(0);
  });

  test('inherits only the bound sacral points for TTS', () => {
    const keypoints = [keypoint('SL', 10), keypoint('SR', 20)];

    expect(
      Array.from(
        getManualMeasurementInheritedPointMap('tts', 4, keypoints).keys()
      )
    ).toEqual([2, 3]);
    expect(
      getEffectiveManualMeasurementPointsNeeded('tts', 4, keypoints)
    ).toBe(2);
  });

  test('inherits the available L/R anchors without creating interaction points', () => {
    const keypoints = [keypoint('ASIS_L', 10), keypoint('SI_R', 30)];

    expect(
      Array.from(
        getManualMeasurementInheritedPointMap(
          'hemipelvic-width-ratio',
          4,
          keypoints
        ).keys()
      )
    ).toEqual([0, 2]);
  });
});
