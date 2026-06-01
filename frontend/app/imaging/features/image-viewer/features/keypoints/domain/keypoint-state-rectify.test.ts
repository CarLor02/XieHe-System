import { expect, it } from '@jest/globals';

import {
  KeypointAnnotation,
  rectifyVertebraCornerOrder,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';

const t1Keypoints: KeypointAnnotation[] = [
  {
    id: 'T1-1',
    point: { x: 10, y: 20 },
    source: AnnotationSource.AI,
    confidence: 0.91,
  },
  {
    id: 'T1-2',
    point: { x: 30, y: 20 },
    source: AnnotationSource.AI,
    confidence: 0.92,
  },
  {
    id: 'T1-3',
    point: { x: 30, y: 40 },
    source: AnnotationSource.AI,
    confidence: 0.93,
  },
  {
    id: 'T1-4',
    point: { x: 10, y: 40 },
    source: AnnotationSource.AI,
    confidence: 0.94,
  },
  {
    id: 'T2-1',
    point: { x: 50, y: 60 },
    source: AnnotationSource.AI,
    confidence: 0.95,
  },
];

it('renames vertebra corner labels without moving their coordinates', () => {
  const result = rectifyVertebraCornerOrder(t1Keypoints, 'T1', [
    { from: 1, to: 3 },
    { from: 2, to: 2 },
    { from: 3, to: 1 },
    { from: 4, to: 4 },
  ]);

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const byId = new Map(result.keypoints.map(keypoint => [keypoint.id, keypoint]));
  expect(byId.get('T1-3')?.point).toEqual({ x: 10, y: 20 });
  expect(byId.get('T1-1')?.point).toEqual({ x: 30, y: 40 });
  expect(byId.get('T1-3')?.source).toBe(AnnotationSource.MANUAL);
  expect(byId.get('T1-1')?.source).toBe(AnnotationSource.MANUAL);
  expect(byId.get('T1-2')?.source).toBe(AnnotationSource.AI);
  expect(byId.get('T2-1')?.point).toEqual({ x: 50, y: 60 });
});

it('rejects target labels that do not contain all four corner numbers', () => {
  const result = rectifyVertebraCornerOrder(t1Keypoints, 'T1', [
    { from: 1, to: 2 },
    { from: 2, to: 2 },
    { from: 3, to: 3 },
    { from: 4, to: 4 },
  ]);

  expect(result).toEqual({
    ok: false,
    missingSequenceNumbers: [1],
  });
});
