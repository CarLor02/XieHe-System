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

  expect(synced?.map(keypoint => keypoint.id)).toEqual([
    'C2-3',
    'C2-4',
    'C7-3',
    'C7-4',
  ]);
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
