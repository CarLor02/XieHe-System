import { expect, it } from 'vitest';

import {
  backfillMissingBoundKeypoints,
  buildBoundMeasurementPoints,
  buildBoundMeasurementPointsForMeasurement,
  getMeasurementKeypointBindingRule,
  getMeasurementKeypointBindingRuleForMeasurement,
  normalizeBoundMeasurementPoints,
  writeMeasurementToKeypoints,
  writeMeasurementPointsToKeypoints,
} from './measurement-keypoint-binding';
import { normalizePelvicDraggedMeasurementPoints } from './pelvic-binding-rule';
import type { KeypointAnnotation } from '../keypoints';
import {
  createHemipelvicWidthRatioPoints,
  getHemipelvicVerticalLines,
  sortHemipelvicVerticalLines,
} from '../measurements/manual-tools/ap';
import {
  AnnotationSource,
} from '../contracts';
import type { MeasurementData } from '../contracts';

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

it('rebuilds bilateral PI from FH keypoints while preserving circle radii', () => {
  const measurement: MeasurementData = {
    id: 'pi-bilateral',
    type: 'PI',
    value: '0.00°',
    pelvicMetadata: {
      schemaVersion: 2,
      femoralHeadMode: 'bilateral',
    },
    points: [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 60, y: 20 },
      { x: 90, y: 20 },
      { x: 20, y: 100 },
      { x: 80, y: 100 },
    ],
  };

  const rebuilt = buildBoundMeasurementPointsForMeasurement(measurement, [
    keypoint('FH-1', 15, 25),
    keypoint('FH-2', 70, 30),
    keypoint('S1-1', 25, 110),
    keypoint('S1-2', 85, 110),
  ]);

  expect(rebuilt).toEqual([
    { x: 15, y: 25 },
    { x: 35, y: 25 },
    { x: 70, y: 30 },
    { x: 100, y: 30 },
    { x: 25, y: 110 },
    { x: 85, y: 110 },
  ]);
});

it('moves both FH centers when bilateral TPA effective CFH is dragged', () => {
  const keypoints = [
    keypoint('FH-1', 10, 20),
    keypoint('FH-2', 30, 40),
    keypoint('S1-1', 20, 100),
    keypoint('S1-2', 40, 100),
  ];
  const measurement: MeasurementData = {
    id: 'tpa-bilateral',
    type: 'TPA',
    value: '0.00°',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 20, y: 30 },
      { x: 20, y: 100 },
      { x: 40, y: 100 },
    ],
    pelvicMetadata: {
      schemaVersion: 2,
      femoralHeadMode: 'bilateral',
    },
  };
  const movedPoints = measurement.points.map((point, index) =>
    index === 4 ? { x: 25, y: 35 } : point
  );

  const written = writeMeasurementToKeypoints(
    keypoints,
    measurement,
    movedPoints,
    4
  );

  expect(written.find(item => item.id === 'FH-1')?.point).toEqual({
    x: 15,
    y: 25,
  });
  expect(written.find(item => item.id === 'FH-2')?.point).toEqual({
    x: 35,
    y: 45,
  });
  expect(written.some(item => item.id === 'CFH')).toBe(false);
});

it('writes new ten-point bilateral TPA centers without creating CFH', () => {
  const measurement: MeasurementData = {
    id: 'tpa-bilateral-v2',
    type: 'TPA',
    value: '0.00°',
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 10, y: 20 },
      { x: 25, y: 20 },
      { x: 50, y: 30 },
      { x: 70, y: 30 },
      { x: 20, y: 100 },
      { x: 80, y: 100 },
    ],
    pelvicMetadata: {
      schemaVersion: 2,
      femoralHeadMode: 'bilateral',
    },
  };

  const written = writeMeasurementToKeypoints([], measurement, measurement.points);

  expect(written.find(item => item.id === 'FH-1')?.point).toEqual({
    x: 10,
    y: 20,
  });
  expect(written.find(item => item.id === 'FH-2')?.point).toEqual({
    x: 50,
    y: 30,
  });
  expect(written.find(item => item.id === 'S1-2')?.point).toEqual({
    x: 80,
    y: 100,
  });
  expect(written.some(item => item.id === 'CFH')).toBe(false);
});

it('moves a bilateral TPA radius handle with its FH center', () => {
  const measurement: MeasurementData = {
    id: 'tpa-bilateral-v2',
    type: 'TPA',
    value: '0.00°',
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 10, y: 20 },
      { x: 25, y: 20 },
      { x: 50, y: 30 },
      { x: 70, y: 30 },
      { x: 20, y: 100 },
      { x: 80, y: 100 },
    ],
    pelvicMetadata: {
      schemaVersion: 2,
      femoralHeadMode: 'bilateral',
    },
  };
  const requested = measurement.points.map((point, index) =>
    index === 4 ? { x: 20, y: 30 } : point
  );

  const normalized = normalizePelvicDraggedMeasurementPoints(
    measurement,
    requested,
    4
  );

  expect(normalized[4]).toEqual({ x: 20, y: 30 });
  expect(normalized[5]).toEqual({ x: 35, y: 30 });
  expect(normalized.slice(0, 4)).toEqual(measurement.points.slice(0, 4));
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

it('resolves AVT binding from metadata and backfills only anatomical keypoints', () => {
  const measurement: MeasurementData = {
    id: 'ap-keypoint-avt-disc-t12-l1',
    type: 'avt',
    value: '1.00mm',
    points: [
      { x: 120, y: 100 },
      { x: 180, y: 100 },
      { x: 300, y: 400 },
      { x: 200, y: 400 },
    ],
    avtMetadata: {
      schemaVersion: 2,
      target: {
        type: 'disc',
        upperVertebra: 'T12',
        lowerVertebra: 'L1',
      },
      referenceLine: 'csvl',
    },
  };

  expect(
    getMeasurementKeypointBindingRuleForMeasurement(measurement)
      ?.requiredKeypointIds
  ).toEqual(['SR', 'SL']);
  expect(
    backfillMissingBoundKeypoints([], [measurement]).map(item => item.id)
  ).toEqual(expect.arrayContaining(['SR', 'SL']));
});

it('writes a schema-v2 AVT reference drag through the dynamic binding rule', () => {
  const measurement: MeasurementData = {
    id: 'ap-keypoint-avt-t2',
    type: 'avt',
    value: '1.00mm',
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 100, y: 200 },
      { x: 200, y: 200 },
      { x: 80, y: 20 },
      { x: 180, y: 20 },
      { x: 80, y: 60 },
      { x: 180, y: 60 },
    ],
    avtMetadata: {
      schemaVersion: 2,
      target: { type: 'vertebra', vertebra: 'T2' },
      referenceLine: 'c7pl',
    },
  };

  const written = writeMeasurementToKeypoints(
    [keypoint('C7-2', 180, 20)],
    measurement,
    measurement.points.map((point, index) =>
      index === 5 ? { x: 190, y: 25 } : point
    ),
    5
  );

  expect(written).toHaveLength(1);
  expect(written[0]).toEqual(
    expect.objectContaining({
      id: 'C7-2',
      point: { x: 190, y: 25 },
      source: AnnotationSource.MANUAL,
    })
  );
});

it('does not guess bindings for legacy AVT measurements without metadata', () => {
  const legacy: MeasurementData = {
    id: 'ap-keypoint-avt',
    type: 'avt',
    value: '1.00mm',
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ],
  };

  expect(getMeasurementKeypointBindingRuleForMeasurement(legacy)).toBeNull();
  expect(backfillMissingBoundKeypoints([], [legacy])).toEqual([]);
});
