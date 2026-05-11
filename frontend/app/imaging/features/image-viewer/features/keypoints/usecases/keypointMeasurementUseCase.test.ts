import { expect, it } from '@jest/globals';

import { rebuildKeypointMeasurements } from '@/app/imaging/features/image-viewer/features/keypoints/usecases/keypointMeasurementUseCase';
import { AnnotationSource, MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

function apCorner(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.AI,
    confidence: 1,
  };
}

it('replaces first-pass AI Cobb measurements with numbered keypoint-derived Cobb measurements', () => {
  const firstPassCobb: MeasurementData[] = [
    {
      id: 'ai-cobb-1',
      type: 'cobb1',
      value: '20.00°',
      points: [],
      upperVertebra: 'T12',
      lowerVertebra: 'L1',
    },
  ];
  const keypoints: KeypointAnnotation[] = [
    apCorner('T12-1', 100, 100),
    apCorner('T12-2', 200, 100),
    apCorner('T12-3', 100, 130),
    apCorner('T12-4', 200, 130),
    apCorner('L1-1', 180, 180),
    apCorner('L1-2', 280, 180),
    apCorner('L1-3', 160, 230),
    apCorner('L1-4', 260, 266),
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements: firstPassCobb,
    keypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext: {
      standardDistance: null,
      standardDistancePoints: [],
      imageNaturalSize: { width: 1000, height: 1000 },
    },
    aiMeasurementIds: new Set(['ai-cobb-1']),
  });

  expect(rebuilt.map(measurement => measurement.type)).toEqual(['cobb1']);
  expect(rebuilt[0].upperVertebra).toBe('T12');
  expect(rebuilt[0].lowerVertebra).toBe('L1');
});
