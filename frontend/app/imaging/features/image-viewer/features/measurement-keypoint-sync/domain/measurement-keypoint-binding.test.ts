import { expect, it } from '@jest/globals';

import {
  backfillMissingBoundKeypoints,
  buildBoundMeasurementPoints,
  getMeasurementKeypointBindingRule,
  normalizeBoundMeasurementPoints,
  writeMeasurementPointsToKeypoints,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-binding';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  createHemipelvicWidthRatioPoints,
  getHemipelvicVerticalLines,
  sortHemipelvicVerticalLines,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/hemipelvic-width-ratio';
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

it('sorts CA points from screen left CL to screen right CR and rebuilds CA', () => {
  const written = writeMeasurementPointsToKeypoints([], 'ca', [
    { x: 200, y: 100 },
    { x: 100, y: 90 },
  ]);

  expect(written.find(item => item.id === 'CL')?.point).toEqual({
    x: 100,
    y: 90,
  });
  expect(written.find(item => item.id === 'CR')?.point).toEqual({
    x: 200,
    y: 100,
  });

  const moved = written.map(item =>
    item.id === 'CL' ? { ...item, point: { x: 80, y: 70 } } : item
  );
  expect(buildBoundMeasurementPoints('ca', moved)).toEqual([
    { x: 80, y: 70 },
    { x: 200, y: 100 },
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

  const written = writeMeasurementPointsToKeypoints(existing, 'tts', points, 2);
  expect(written.find(item => item.id === 'SR')).toEqual(
    expect.objectContaining({
      point: { x: 320, y: 210 },
      source: AnnotationSource.MANUAL,
    })
  );
  expect(written.find(item => item.id === 'SL')?.source).toBe(
    AnnotationSource.AI
  );
});

it('rebuilds TTS sacral points from SL and SR without moving its trunk line', () => {
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
    { x: 190, y: 205 },
    { x: 320, y: 210 },
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

it('writes PO and CSS into left-to-right AP pose keypoints', () => {
  const po = writeMeasurementPointsToKeypoints([], 'po', [
    { x: 280, y: 160 },
    { x: 120, y: 150 },
  ]);
  const css = writeMeasurementPointsToKeypoints(po, 'css', [
    { x: 300, y: 240 },
    { x: 100, y: 230 },
  ]);

  expect(css.find(item => item.id === 'IL')?.point.x).toBe(120);
  expect(css.find(item => item.id === 'IR')?.point.x).toBe(280);
  expect(css.find(item => item.id === 'SL')?.point.x).toBe(100);
  expect(css.find(item => item.id === 'SR')?.point.x).toBe(300);
});

it('keeps historical Pelvic and Sacral measurement type aliases bound', () => {
  expect(getMeasurementKeypointBindingRule('Pelvic')?.typeId).toBe('po');
  expect(getMeasurementKeypointBindingRule('Sacral')?.typeId).toBe('css');
});

it('sorts TS C7 corners and sacral points before writing all six keypoints', () => {
  const rawPoints = [
    { x: 220, y: 120 },
    { x: 100, y: 220 },
    { x: 100, y: 100 },
    { x: 220, y: 230 },
    { x: 300, y: 400 },
    { x: 80, y: 390 },
  ];
  const normalized = normalizeBoundMeasurementPoints('ts', rawPoints);
  const written = writeMeasurementPointsToKeypoints([], 'ts', rawPoints);

  expect(normalized).toEqual([
    { x: 100, y: 100 },
    { x: 220, y: 120 },
    { x: 100, y: 220 },
    { x: 220, y: 230 },
    { x: 80, y: 390 },
    { x: 300, y: 400 },
  ]);
  expect(
    ['C7-1', 'C7-2', 'C7-3', 'C7-4', 'SL', 'SR'].map(
      id => written.find(item => item.id === id)?.point
    )
  ).toEqual(normalized);
});

it('writes fixed lateral endplates without requiring complete vertebra groups', () => {
  const written = writeMeasurementPointsToKeypoints([], 'tk-t2-t5', [
    { x: 220, y: 100 },
    { x: 100, y: 110 },
    { x: 260, y: 300 },
    { x: 140, y: 290 },
  ]);

  expect(written.map(item => item.id)).toEqual(
    expect.arrayContaining(['T2-1', 'T2-2', 'T5-3', 'T5-4'])
  );
  expect(written.find(item => item.id === 'T2-1')?.point.x).toBe(100);
  expect(written.find(item => item.id === 'T5-3')?.point.x).toBe(140);
});

it('keeps generic Cobb tools outside the automatic binding registry', () => {
  expect(getMeasurementKeypointBindingRule('cobb')).toBeNull();
  expect(getMeasurementKeypointBindingRule('Cobb3')).toBeNull();
  expect(getMeasurementKeypointBindingRule('lateral-cobb')).toBeNull();
  expect(getMeasurementKeypointBindingRule('lateral-cobb2')).toBeNull();
});
