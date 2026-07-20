import { expect, it } from '@jest/globals';

import {
  backfillMissingBoundKeypoints,
  buildBoundMeasurementPoints,
  shouldWriteMeasurementKeypointsOnComplete,
  writeMeasurementPointsToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-keypoint-binding';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  createHemipelvicWidthRatioPoints,
  getHemipelvicVerticalLines,
  sortHemipelvicVerticalLines,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';
import {
  AnnotationSource,
  MeasurementData,
} from '@/app/imaging/features/image-viewer/shared/types';

function keypoint(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.MANUAL,
    confidence: 1,
  };
}

it('writes CA points to CR and CL and rebuilds CA from moved keypoints', () => {
  const written = writeMeasurementPointsToKeypoints([], 'ca', [
    { x: 200, y: 100 },
    { x: 100, y: 90 },
  ]);

  expect(written.find(item => item.id === 'CR')?.point).toEqual({
    x: 200,
    y: 100,
  });
  expect(written.find(item => item.id === 'CL')?.point).toEqual({
    x: 100,
    y: 90,
  });

  const moved = written.map(item =>
    item.id === 'CL' ? { ...item, point: { x: 80, y: 70 } } : item
  );
  expect(buildBoundMeasurementPoints('ca', moved)).toEqual([
    { x: 200, y: 100 },
    { x: 80, y: 70 },
  ]);
});

it('marks only the CA endpoint changed by a measurement drag as manual', () => {
  const existing = [
    {
      ...keypoint('CR', 200, 100),
      source: AnnotationSource.AI,
    },
    {
      ...keypoint('CL', 100, 100),
      source: AnnotationSource.AI,
    },
  ];

  const written = writeMeasurementPointsToKeypoints(
    existing,
    'ca',
    [
      { x: 220, y: 120 },
      { x: 100, y: 100 },
    ],
    0
  );

  expect(written.find(item => item.id === 'CR')?.source).toBe(
    AnnotationSource.MANUAL
  );
  expect(written.find(item => item.id === 'CL')?.source).toBe(
    AnnotationSource.AI
  );
});

it('binds only TTS sacral points to SR and SL', () => {
  const existing = [
    {
      ...keypoint('SR', 300, 200),
      source: AnnotationSource.AI,
    },
    {
      ...keypoint('SL', 200, 200),
      source: AnnotationSource.AI,
    },
  ];
  const points = [
    { x: 100, y: 50 },
    { x: 180, y: 50 },
    { x: 320, y: 210 },
    { x: 200, y: 200 },
  ];

  const unchanged = writeMeasurementPointsToKeypoints(
    existing,
    'tts',
    points,
    0
  );
  expect(unchanged).toBe(existing);

  const written = writeMeasurementPointsToKeypoints(
    existing,
    'tts',
    points,
    2
  );
  expect(written.find(item => item.id === 'SR')).toEqual(
    expect.objectContaining({
      point: { x: 320, y: 210 },
      source: AnnotationSource.MANUAL,
    })
  );
  expect(written.find(item => item.id === 'SL')?.source).toBe(
    AnnotationSource.AI
  );
  expect(shouldWriteMeasurementKeypointsOnComplete('tts')).toBe(false);
});

it('rebuilds TTS sacral points from SR and SL without moving its trunk line', () => {
  const existingPoints = [
    { x: 100, y: 50 },
    { x: 180, y: 50 },
    { x: 300, y: 200 },
    { x: 200, y: 200 },
  ];

  expect(
    buildBoundMeasurementPoints(
      'tts',
      [keypoint('SR', 320, 210), keypoint('SL', 190, 205)],
      existingPoints
    )
  ).toEqual([
    { x: 100, y: 50 },
    { x: 180, y: 50 },
    { x: 320, y: 210 },
    { x: 190, y: 205 },
  ]);
});

it('maps unordered L/R anchors to semantic keypoints from screen left to right', () => {
  const points = createHemipelvicWidthRatioPoints([
    { x: 300, y: 130 },
    { x: 100, y: 110 },
    { x: 400, y: 140 },
    { x: 200, y: 120 },
  ]);

  const written = writeMeasurementPointsToKeypoints(
    [],
    'hemipelvic-width-ratio',
    points
  );

  expect(
    ['ASIS_L', 'SI_L', 'SI_R', 'ASIS_R'].map(
      id => written.find(item => item.id === id)?.point.x
    )
  ).toEqual([100, 200, 300, 400]);
});

it('rebuilds L/R from moved keypoints without resetting adjusted line lengths', () => {
  const original = createHemipelvicWidthRatioPoints([
    { x: 100, y: 100 },
    { x: 200, y: 110 },
    { x: 300, y: 120 },
    { x: 400, y: 130 },
  ]);
  original[4] = { x: 100, y: 40 };
  original[5] = { x: 100, y: 180 };

  const rebuilt = buildBoundMeasurementPoints(
    'hemipelvic-width-ratio',
    [
      keypoint('ASIS_L', 120, 105),
      keypoint('SI_L', 200, 110),
      keypoint('SI_R', 300, 120),
      keypoint('ASIS_R', 400, 130),
    ],
    original
  );

  expect(rebuilt).not.toBeNull();
  const leftLine = sortHemipelvicVerticalLines(
    getHemipelvicVerticalLines(rebuilt!)
  )[0];
  expect(leftLine.anchor).toEqual({ x: 120, y: 105 });
  expect(leftLine.top).toEqual({ x: 120, y: 45 });
  expect(leftLine.bottom).toEqual({ x: 120, y: 185 });
});

it('backfills missing CA, TTS, and L/R keypoints from historical measurements', () => {
  const measurements: MeasurementData[] = [
    {
      id: 'legacy-ca',
      type: 'ca',
      value: '0.00°',
      points: [
        { x: 200, y: 100 },
        { x: 100, y: 100 },
      ],
    },
    {
      id: 'legacy-tts',
      type: 'tts',
      value: '-10.00mm',
      points: [
        { x: 100, y: 50 },
        { x: 180, y: 50 },
        { x: 320, y: 210 },
        { x: 190, y: 205 },
      ],
    },
    {
      id: 'legacy-lr',
      type: 'hemipelvic-width-ratio',
      value: '1.00',
      points: createHemipelvicWidthRatioPoints([
        { x: 400, y: 100 },
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 200, y: 100 },
      ]),
    },
  ];

  const backfilled = backfillMissingBoundKeypoints([], measurements);

  expect(backfilled.map(item => item.id)).toEqual(
    expect.arrayContaining([
      'CR',
      'CL',
      'SR',
      'SL',
      'ASIS_L',
      'SI_L',
      'SI_R',
      'ASIS_R',
    ])
  );
  expect(backfilled.find(item => item.id === 'SR')?.point).toEqual({
    x: 320,
    y: 210,
  });
  expect(backfilled.find(item => item.id === 'SL')?.point).toEqual({
    x: 190,
    y: 205,
  });
  expect(backfilled.find(item => item.id === 'ASIS_L')?.point.x).toBe(100);
  expect(backfilled.find(item => item.id === 'ASIS_R')?.point.x).toBe(400);
});
