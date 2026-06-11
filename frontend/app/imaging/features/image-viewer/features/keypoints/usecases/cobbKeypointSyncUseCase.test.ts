import { expect, it } from '@jest/globals';

import { syncCobbMeasurementToKeypoints } from '@/app/imaging/features/image-viewer/features/keypoints/usecases/cobbKeypointSyncUseCase';
import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

const points: Point[] = [
  { x: 10, y: 10 },
  { x: 20, y: 10 },
  { x: 30, y: 40 },
  { x: 40, y: 40 },
];

function pointByKeypointId(
  keypoints: KeypointAnnotation[] | null
): Record<string, Point> {
  return Object.fromEntries(
    (keypoints ?? []).map(keypoint => [keypoint.id, keypoint.point])
  );
}

it('replaces Cobb endpoint keypoints with the Cobb measurement points', () => {
  const measurement: MeasurementData = {
    id: 'cobb-2',
    type: 'cobb2',
    value: '18.00°',
    points,
    upperVertebra: 'T2',
    lowerVertebra: 'T10',
  };
  const existingKeypoints: KeypointAnnotation[] = [
    {
      id: 'T2-1',
      point: { x: 1, y: 1 },
      source: AnnotationSource.AI,
      confidence: 0.8,
    },
    {
      id: 'T2-2',
      point: { x: 2, y: 1 },
      source: AnnotationSource.AI,
      confidence: 0.8,
    },
    {
      id: 'T10-3',
      point: { x: 3, y: 4 },
      source: AnnotationSource.AI,
      confidence: 0.8,
    },
    {
      id: 'T10-4',
      point: { x: 4, y: 4 },
      source: AnnotationSource.AI,
      confidence: 0.8,
    },
    {
      id: 'T5-1',
      point: { x: 5, y: 5 },
      source: AnnotationSource.AI,
      confidence: 0.9,
    },
  ];

  const synced = syncCobbMeasurementToKeypoints(
    existingKeypoints,
    measurement
  );

  expect(
    synced
      ?.filter(keypoint => ['T2-1', 'T2-2', 'T10-3', 'T10-4'].includes(keypoint.id))
      .map(keypoint => ({
        id: keypoint.id,
        point: keypoint.point,
        source: keypoint.source,
        confidence: keypoint.confidence,
      }))
  ).toEqual([
    {
      id: 'T2-1',
      point: points[0],
      source: AnnotationSource.MANUAL,
      confidence: 1,
    },
    {
      id: 'T2-2',
      point: points[1],
      source: AnnotationSource.MANUAL,
      confidence: 1,
    },
    {
      id: 'T10-3',
      point: points[2],
      source: AnnotationSource.MANUAL,
      confidence: 1,
    },
    {
      id: 'T10-4',
      point: points[3],
      source: AnnotationSource.MANUAL,
      confidence: 1,
    },
  ]);
  expect(synced?.some(keypoint => keypoint.id === 'T5-1')).toBe(true);
});

it('uses anterior endpoint keypoint order for anterior Cobb even when endpoints match a lateral named Cobb', () => {
  const measurement: MeasurementData = {
    id: 'cobb-t5-t12',
    type: 'cobb1',
    value: '18.00°',
    points,
    upperVertebra: 'T5',
    lowerVertebra: 'T12',
  };

  const synced = syncCobbMeasurementToKeypoints(
    [],
    measurement,
    '正位X光片'
  );

  expect(pointByKeypointId(synced)).toEqual({
    'T5-1': points[0],
    'T5-2': points[1],
    'T12-3': points[2],
    'T12-4': points[3],
  });
});

it('syncs lateral C2-C7 Cobb to lower endplate keypoints', () => {
  const measurement: MeasurementData = {
    id: 'cobb-1',
    type: 'cobb1',
    value: '18.00°',
    points,
    upperVertebra: 'C2',
    lowerVertebra: 'C7',
  };

  const synced = syncCobbMeasurementToKeypoints([], measurement, '侧位X光片');

  expect(pointByKeypointId(synced)).toEqual({
    'C2-4': points[0],
    'C2-3': points[1],
    'C7-4': points[2],
    'C7-3': points[3],
  });
});

it('infers C2-C7 lateral Cobb endpoint keypoints even when exam type is omitted', () => {
  const measurement: MeasurementData = {
    id: 'cobb-1',
    type: 'cobb1',
    value: '18.00°',
    points,
    upperVertebra: 'C2',
    lowerVertebra: 'C7',
  };

  const synced = syncCobbMeasurementToKeypoints([], measurement);

  expect(pointByKeypointId(synced)).toEqual({
    'C2-4': points[0],
    'C2-3': points[1],
    'C7-4': points[2],
    'C7-3': points[3],
  });
});

it('syncs lateral Cobb to S1 upper endplate keypoints', () => {
  const measurement: MeasurementData = {
    id: 'cobb-3',
    type: 'cobb3',
    value: '18.00°',
    points,
    upperVertebra: 'L4',
    lowerVertebra: 'S1',
  };

  const synced = syncCobbMeasurementToKeypoints([], measurement, '侧位X光片');

  expect(pointByKeypointId(synced)).toEqual({
    'L4-2': points[0],
    'L4-1': points[1],
    'S1-1': points[2],
    'S1-2': points[3],
  });
});

it('does not sync Cobb measurements without completed endpoint vertebrae', () => {
  const measurement: MeasurementData = {
    id: 'cobb-2',
    type: 'cobb2',
    value: '18.00°',
    points,
    upperVertebra: 'T2',
    lowerVertebra: null,
  };

  expect(syncCobbMeasurementToKeypoints([], measurement)).toBeNull();
});
