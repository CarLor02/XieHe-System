import { expect, it } from '@jest/globals';

import { getApKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import { rebuildKeypointMeasurements } from '@/app/imaging/features/image-viewer/features/keypoints/usecases/keypointMeasurementUseCase';
import { AnnotationSource, MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import {
  getCompleteApVertebraGroups,
  keypointsToRenderLayer,
  KeypointAnnotation,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

function apCorner(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.AI,
    confidence: 1,
  };
}

function l4L5LumbarCobbKeypoints(): KeypointAnnotation[] {
  return [
    apCorner('L4-1', 60, 90),
    apCorner('L4-2', 160, 90),
    apCorner('L4-3', 60, 130),
    apCorner('L4-4', 160, 130),
    apCorner('L5-1', 160, 180),
    apCorner('L5-2', 260, 200),
    apCorner('L5-3', 160, 220),
    apCorner('L5-4', 260, 260),
  ];
}

const calculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};

it('includes L5 in AP keypoint groups and complete AP render layers', () => {
  const groups = getApKeypointGroups();
  const l5Group = groups.find(group => group.id === 'L5');
  const keypoints = l4L5LumbarCobbKeypoints().filter(keypoint =>
    keypoint.id.startsWith('L5-')
  );

  expect(l5Group?.keypoints.map(keypoint => keypoint.id)).toEqual([
    'L5-1',
    'L5-2',
    'L5-3',
    'L5-4',
  ]);
  expect(getCompleteApVertebraGroups(keypoints)).toContain('L5');
  expect(
    keypointsToRenderLayer(keypoints, '正位X光片').map(item => item.label)
  ).toContain('L5');
});

it('derives AP Lumbar Cobb measurements with L5 as an endpoint', () => {
  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements: [],
    keypoints: l4L5LumbarCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([
    expect.objectContaining({
      type: 'cobb1',
      upperVertebra: 'L4',
      lowerVertebra: 'L5',
      apexVertebra: 'L4',
    }),
  ]);
});

it('starts keypoint-derived Cobb numbering after the current maximum Cobb number', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-cobb-1',
      type: 'cobb1',
      value: '10.00°',
      points: [],
    },
    {
      id: 'manual-cobb-3',
      type: 'cobb3',
      value: '20.00°',
      points: [],
    },
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements,
    keypoints: l4L5LumbarCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt.map(measurement => measurement.type)).toEqual([
    'cobb1',
    'cobb3',
    'cobb4',
  ]);
});

it('rebuilds a keypoint-synced manual Cobb measurement when endpoint keypoints move', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-cobb-1',
      type: 'cobb1',
      value: '10.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      keypointSynced: true,
    },
  ];
  const movedKeypoints = [
    apCorner('T1-1', 100, 100),
    apCorner('T1-2', 200, 100),
    apCorner('T3-3', 100, 260),
    apCorner('T3-4', 200, 280),
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements,
    keypoints: movedKeypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([
    expect.objectContaining({
      id: 'manual-cobb-1',
      type: 'cobb1',
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 100, y: 260 },
        { x: 200, y: 280 },
      ],
    }),
  ]);
});

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
    calculationContext,
    aiMeasurementIds: new Set(['ai-cobb-1']),
  });

  expect(rebuilt.map(measurement => measurement.type)).toEqual(['cobb1']);
  expect(rebuilt[0].upperVertebra).toBe('T12');
  expect(rebuilt[0].lowerVertebra).toBe('L1');
});
