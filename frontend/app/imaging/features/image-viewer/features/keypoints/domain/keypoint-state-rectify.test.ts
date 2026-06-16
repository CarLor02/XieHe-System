import { expect, it } from '@jest/globals';

import {
  KeypointAnnotation,
  rectifyVertebraCornerOrder,
  shiftVertebraLabels,
  shiftMeasurementVertebraLabels,
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

it('migrates vertebra corner coordinates with their edited labels', () => {
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

it('shifts vertebra labels in range and overwrites existing target keypoints', () => {
  const keypoints: KeypointAnnotation[] = [
    ...t1Keypoints,
    {
      id: 'T3-1',
      point: { x: 70, y: 80 },
      source: AnnotationSource.AI,
      confidence: 0.8,
    },
  ];

  const result = shiftVertebraLabels(keypoints, {
    examType: '正位X光片',
    startVertebra: 'T1',
    endVertebra: 'T2',
    direction: 'down',
    offset: 1,
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const byId = new Map(result.keypoints.map(keypoint => [keypoint.id, keypoint]));
  expect(byId.get('T2-1')?.point).toEqual({ x: 10, y: 20 });
  expect(byId.get('T2-1')?.source).toBe(AnnotationSource.MANUAL);
  expect(byId.get('T3-1')?.point).toEqual({ x: 50, y: 60 });
  expect(byId.get('T3-1')?.source).toBe(AnnotationSource.MANUAL);
  expect(byId.has('T1-1')).toBe(false);
});

it('rejects vertebra label shifts when the target point does not exist in the exam catalog', () => {
  const result = shiftVertebraLabels(
    [
      {
        id: 'L5-3',
        point: { x: 1, y: 2 },
        source: AnnotationSource.AI,
        confidence: 0.7,
      },
    ],
    {
      examType: '侧位X光片',
      startVertebra: 'L5',
      endVertebra: 'L5',
      direction: 'down',
      offset: 1,
    }
  );

  expect(result).toEqual({
    ok: false,
    reason: 'target-keypoint-unavailable',
    targetKeypointIds: ['S1-3'],
  });
});

it('shifts measurement vertebra endpoint fields with the same mapping', () => {
  const shifted = shiftMeasurementVertebraLabels(
    [
      {
        id: 'measurement-1',
        type: 'cobb1',
        value: '10.00°',
        points: [],
        upperVertebra: 'T1',
        lowerVertebra: 'T3',
        apexVertebra: 'T2',
      },
      {
        id: 'measurement-2',
        type: 'PO',
        value: '0.00°',
        points: [],
      },
    ],
    new Map([
      ['T1', 'T2'],
      ['T2', 'T3'],
      ['T3', 'T4'],
    ])
  );

  expect(shifted[0]).toEqual(
    expect.objectContaining({
      upperVertebra: 'T2',
      lowerVertebra: 'T4',
      apexVertebra: 'T3',
    })
  );
  expect(shifted[1]).toEqual(
    expect.objectContaining({
      id: 'measurement-2',
      type: 'PO',
    })
  );
});
