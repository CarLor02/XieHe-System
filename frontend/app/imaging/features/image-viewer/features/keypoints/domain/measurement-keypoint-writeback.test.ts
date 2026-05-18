import { expect, it } from '@jest/globals';

import { applyMeasurementPointToVertebrae } from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-keypoint-writeback';
import {
  AnnotationSource,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

function pointLayer(label: string, point: Point): VertebraAnnotation {
  return {
    label,
    corners: [point, point, point, point],
    confidence: 1,
    source: AnnotationSource.AI,
  };
}

it('writes TS upper points back to C7 keypoints instead of T1', () => {
  const t1Point = { x: 100, y: 100 };
  const c7Point = { x: 10, y: 10 };
  const nextPoint = { x: 30, y: 40 };
  const layer = [
    pointLayer('C7-1', c7Point),
    pointLayer('T1-1', t1Point),
  ];

  const result = applyMeasurementPointToVertebrae(
    layer,
    null,
    'ts',
    0,
    nextPoint
  );

  expect(
    result.vertebraeLayer.find(annotation => annotation.label === 'C7-1')
      ?.corners[0]
  ).toEqual(nextPoint);
  expect(
    result.vertebraeLayer.find(annotation => annotation.label === 'T1-1')
      ?.corners[0]
  ).toEqual(t1Point);
});
