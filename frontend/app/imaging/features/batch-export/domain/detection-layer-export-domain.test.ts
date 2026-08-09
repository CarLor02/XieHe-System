import { expect, it } from '@jest/globals';

import {
  AnnotationSource,
  type CfhAnnotation,
  type VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

import { getDetectionLayerKeypoints } from './detection-layer-export-domain';

const point = (x: number, y: number) => ({ x, y });

it('exports grouped AP vertebra corners and pose points as logical keypoints', () => {
  const vertebraeLayer: VertebraAnnotation[] = [
    {
      label: 'T1',
      corners: [point(10, 20), point(30, 20), point(10, 40), point(30, 40)],
      confidence: 0.9,
      source: AnnotationSource.AI,
    },
    {
      label: 'SL',
      corners: [point(50, 60), point(50, 60), point(50, 60), point(50, 60)],
      confidence: 1,
      source: AnnotationSource.MANUAL,
    },
  ];

  const keypoints = getDetectionLayerKeypoints({
    vertebraeLayer,
    examType: '正位X光片',
  });

  expect(keypoints.map(keypoint => keypoint.id)).toEqual([
    'T1-1',
    'T1-2',
    'T1-3',
    'T1-4',
    'SL',
  ]);
  expect(keypoints[0]).toEqual({
    id: 'T1-1',
    point: point(10, 20),
    confidence: 0.9,
    source: AnnotationSource.AI,
  });
  expect(keypoints[4].source).toBe(AnnotationSource.MANUAL);
});

it('exports historical per-corner AP records once without regrouping duplicates', () => {
  const vertebraeLayer = [1, 2, 3, 4].map(
    (index): VertebraAnnotation => ({
      label: `T2-${index}`,
      corners: [
        point(index * 10, 20),
        point(index * 10, 20),
        point(index * 10, 20),
        point(index * 10, 20),
      ],
      confidence: 0.8,
      source: AnnotationSource.AI,
    })
  );

  const keypoints = getDetectionLayerKeypoints({
    vertebraeLayer,
    examType: '正位X光片',
  });

  expect(keypoints.map(keypoint => keypoint.id)).toEqual([
    'T2-1',
    'T2-2',
    'T2-3',
    'T2-4',
  ]);
  expect(keypoints.map(keypoint => keypoint.point.x)).toEqual([10, 20, 30, 40]);
});

it('exports lateral S1 and CFH as detection-layer points', () => {
  const vertebraeLayer: VertebraAnnotation[] = [
    {
      label: 'S1',
      corners: [point(20, 80), point(40, 80), point(20, 80), point(40, 80)],
      confidence: 0.75,
      source: AnnotationSource.AI,
    },
  ];
  const cfhAnnotation: CfhAnnotation = {
    center: point(60, 30),
    confidence: 0.95,
    source: AnnotationSource.MANUAL,
  };

  const keypoints = getDetectionLayerKeypoints({
    vertebraeLayer,
    cfhAnnotation,
    examType: '侧位X光片',
  });

  expect(keypoints.map(keypoint => keypoint.id)).toEqual([
    'CFH',
    'S1-1',
    'S1-2',
  ]);
  expect(keypoints.find(keypoint => keypoint.id === 'CFH')).toEqual({
    id: 'CFH',
    point: point(60, 30),
    confidence: 0.95,
    source: AnnotationSource.MANUAL,
  });
});
