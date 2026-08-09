import { expect, it } from '@jest/globals';

import type { KeypointAnnotation } from '@xiehe/imaging-core/keypoints';
import { AnnotationSource } from '@xiehe/imaging-core/contracts';

import { deriveMissingFixedMeasurementsFromKeypoints } from './deriveMissingFixedMeasurementsUseCase';

const calculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};

function keypoint(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.MANUAL,
    confidence: 1,
  };
}

it('derives every satisfiable fixed measurement after a keypoint confirmation', () => {
  const measurements = deriveMissingFixedMeasurementsFromKeypoints({
    previousMeasurements: [],
    keypoints: [
      keypoint('CL', 10, 10),
      keypoint('CR', 30, 12),
      keypoint('SL', 15, 50),
      keypoint('SR', 35, 52),
    ],
    examType: '正位X光片',
    calculationContext,
  });

  expect(measurements.map(item => item.type)).toEqual(['CA', 'CSS']);
});

it('does not derive Cobb from otherwise complete vertebra keypoints', () => {
  const measurements = deriveMissingFixedMeasurementsFromKeypoints({
    previousMeasurements: [],
    keypoints: [
      keypoint('T1-1', 10, 10),
      keypoint('T1-2', 30, 10),
      keypoint('T1-3', 10, 20),
      keypoint('T1-4', 30, 20),
      keypoint('T2-1', 10, 30),
      keypoint('T2-2', 30, 30),
      keypoint('T2-3', 10, 40),
      keypoint('T2-4', 30, 40),
    ],
    examType: '正位X光片',
    calculationContext,
  });

  expect(measurements.map(item => item.type)).toEqual(['T1 Tilt']);
  expect(measurements.some(item => /^cobb\d+$/i.test(item.type))).toBe(false);
});

it('derives bilateral PI, PT and TPA from effective CFH dependencies', () => {
  const measurements = deriveMissingFixedMeasurementsFromKeypoints({
    previousMeasurements: [],
    keypoints: [
      keypoint('FH-1', 100, 400),
      keypoint('FH-2', 200, 400),
      keypoint('S1-1', 120, 300),
      keypoint('S1-2', 180, 300),
      keypoint('T1-1', 100, 100),
      keypoint('T1-2', 180, 100),
      keypoint('T1-3', 100, 140),
      keypoint('T1-4', 180, 140),
    ],
    examType: '侧位X光片',
    calculationContext,
  });

  const pelvicMeasurements = measurements.filter(item =>
    ['PI', 'PT', 'TPA'].includes(item.type)
  );
  expect(pelvicMeasurements.map(item => item.type)).toEqual(['TPA', 'PI', 'PT']);
  expect(
    pelvicMeasurements.every(
      item => item.pelvicMetadata?.femoralHeadMode === 'bilateral'
    )
  ).toBe(true);
  expect(measurements.find(item => item.type === 'PI')?.points).toHaveLength(6);
  expect(measurements.find(item => item.type === 'TPA')?.points).toHaveLength(10);
  expect(measurements.find(item => item.type === 'TPA')?.points[4]).toEqual({
    x: 100,
    y: 400,
  });
  expect(measurements.find(item => item.type === 'TPA')?.points[6]).toEqual({
    x: 200,
    y: 400,
  });
});

it('does not derive pelvic measurements from conflicting CFH sources', () => {
  const measurements = deriveMissingFixedMeasurementsFromKeypoints({
    previousMeasurements: [],
    keypoints: [
      keypoint('CFH', 150, 400),
      keypoint('FH-1', 100, 400),
      keypoint('FH-2', 200, 400),
      keypoint('S1-1', 120, 300),
      keypoint('S1-2', 180, 300),
    ],
    examType: '侧位X光片',
    calculationContext,
  });

  expect(
    measurements.filter(item => ['PI', 'PT', 'TPA'].includes(item.type))
  ).toEqual([]);
});
