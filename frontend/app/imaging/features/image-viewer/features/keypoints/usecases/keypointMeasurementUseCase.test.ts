import { expect, it } from '@jest/globals';

import { getApKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import {
  createNextBoundCobbMeasurement,
  deriveKeypointMeasurements,
  hasCobbMeasurementForEndpoints,
  rebuildKeypointMeasurements,
} from '@/app/imaging/features/image-viewer/features/keypoints/usecases/keypointMeasurementUseCase';
import { AnnotationSource, MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import {
  getCompleteApVertebraGroups,
  keypointsToRenderLayer,
  KeypointAnnotation,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

function apCorner(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.AI,
    confidence: 1,
  };
}

function l4L5LumbarCobbKeypoints(): KeypointAnnotation[] {
  return [
    apCorner('L4-1', 60, 90),
    apCorner('L4-2', 160, 90),
    apCorner('L4-3', 60, 130),
    apCorner('L4-4', 160, 130),
    apCorner('L5-1', 160, 180),
    apCorner('L5-2', 260, 200),
    apCorner('L5-3', 160, 220),
    apCorner('L5-4', 260, 260),
  ];
}

const calculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};

it('includes L5 in AP keypoint groups and complete AP render layers', () => {
  const groups = getApKeypointGroups();
  const l5Group = groups.find(group => group.id === 'L5');
  const keypoints = l4L5LumbarCobbKeypoints().filter(keypoint =>
    keypoint.id.startsWith('L5-')
  );

  expect(l5Group?.keypoints.map(keypoint => keypoint.id)).toEqual([
    'L5-1',
    'L5-2',
    'L5-3',
    'L5-4',
  ]);
  expect(getCompleteApVertebraGroups(keypoints)).toContain('L5');
  expect(
    keypointsToRenderLayer(keypoints, '正位X光片').map(item => item.label)
  ).toContain('L5');
});

it('derives AP Lumbar Cobb measurements with L5 as an endpoint', () => {
  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements: [],
    keypoints: l4L5LumbarCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([
    expect.objectContaining({
      type: 'cobb1',
      upperVertebra: 'L4',
      lowerVertebra: 'L5',
      apexVertebra: 'L4',
    }),
  ]);
});

it('starts keypoint-derived Cobb numbering after the current maximum Cobb number', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-cobb-1',
      type: 'cobb1',
      value: '10.00°',
      points: [],
    },
    {
      id: 'manual-cobb-3',
      type: 'cobb3',
      value: '20.00°',
      points: [],
    },
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements,
    keypoints: l4L5LumbarCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt.map(measurement => measurement.type)).toEqual([
    'cobb1',
    'cobb3',
    'cobb4',
  ]);
});

it('creates a numbered keypoint-bound Cobb from selected endpoint vertebrae', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-cobb-2',
      type: 'cobb2',
      value: '10.00°',
      points: [],
    },
  ];
  const measurement = createNextBoundCobbMeasurement({
    upperVertebra: 'T1',
    lowerVertebra: 'T3',
    keypoints: [
      apCorner('T1-1', 10, 10),
      apCorner('T1-2', 30, 12),
      apCorner('T3-3', 20, 100),
      apCorner('T3-4', 40, 108),
    ],
    examType: '正位X光片',
    calculationContext,
    existingMeasurements: previousMeasurements,
  });

  expect(measurement).toEqual(
    expect.objectContaining({
      id: 'vertebrae-derived-cobb-bound-t1-t3',
      type: 'cobb3',
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      keypointSynced: true,
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 12 },
        { x: 20, y: 100 },
        { x: 40, y: 108 },
      ],
    })
  );
});

it('creates lateral C2-C7 Cobb from lower endplates', () => {
  const measurement = createNextBoundCobbMeasurement({
    upperVertebra: 'C2',
    lowerVertebra: 'C7',
    keypoints: [
      apCorner('C2-1', 10, 10),
      apCorner('C2-2', 30, 10),
      apCorner('C2-3', 10, 30),
      apCorner('C2-4', 30, 30),
      apCorner('C7-1', 20, 100),
      apCorner('C7-2', 50, 100),
      apCorner('C7-3', 20, 130),
      apCorner('C7-4', 50, 130),
    ],
    examType: '侧位X光片',
    calculationContext,
    existingMeasurements: [],
  });

  expect(measurement).toEqual(
    expect.objectContaining({
      type: 'cobb1',
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      keypointSynced: true,
      points: [
        { x: 30, y: 30 },
        { x: 10, y: 30 },
        { x: 50, y: 130 },
        { x: 20, y: 130 },
      ],
    })
  );
});

it('creates lateral Cobb to S1 from S1 upper endplate points', () => {
  const measurement = createNextBoundCobbMeasurement({
    upperVertebra: 'L4',
    lowerVertebra: 'S1',
    keypoints: [
      apCorner('L4-1', 100, 100),
      apCorner('L4-2', 180, 110),
      apCorner('L4-3', 100, 140),
      apCorner('L4-4', 180, 150),
      apCorner('S1-1', 120, 240),
      apCorner('S1-2', 220, 250),
    ],
    examType: '侧位X光片',
    calculationContext,
    existingMeasurements: [],
  });

  expect(measurement?.points).toEqual([
    { x: 180, y: 110 },
    { x: 100, y: 100 },
    { x: 120, y: 240 },
    { x: 220, y: 250 },
  ]);
});

it('rebuilds a lateral keypoint-synced Cobb with lateral endpoint rules', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-lateral-cobb',
      type: 'cobb1',
      value: '10.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      keypointSynced: true,
    },
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements,
    keypoints: [
      apCorner('C2-1', 10, 10),
      apCorner('C2-2', 20, 10),
      apCorner('C2-3', 30, 30),
      apCorner('C2-4', 40, 30),
      apCorner('C7-1', 50, 80),
      apCorner('C7-2', 60, 80),
      apCorner('C7-3', 70, 100),
      apCorner('C7-4', 80, 100),
    ],
    cfhAnnotation: null,
    examType: '侧位X光片',
    isLateralView: true,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(
    rebuilt.find(measurement => measurement.id === 'manual-lateral-cobb')
  ).toEqual(
    expect.objectContaining({
      points: [
        { x: 40, y: 30 },
        { x: 30, y: 30 },
        { x: 80, y: 100 },
        { x: 70, y: 100 },
      ],
    })
  );
});

it('detects duplicate Cobb endpoint pairs regardless of Cobb sequence number', () => {
  const measurements: MeasurementData[] = [
    {
      id: 'existing-cobb',
      type: 'cobb4',
      value: '12.00°',
      points: [],
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
    },
  ];

  expect(hasCobbMeasurementForEndpoints(measurements, 'T1', 'T3')).toBe(true);
  expect(hasCobbMeasurementForEndpoints(measurements, 'T3', 'T1')).toBe(false);
});

it('rebuilds a keypoint-synced manual Cobb measurement when endpoint keypoints move', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-cobb-1',
      type: 'cobb1',
      value: '10.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      keypointSynced: true,
    },
  ];
  const movedKeypoints = [
    apCorner('T1-1', 100, 100),
    apCorner('T1-2', 200, 100),
    apCorner('T3-3', 100, 260),
    apCorner('T3-4', 200, 280),
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements,
    keypoints: movedKeypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([
    expect.objectContaining({
      id: 'manual-cobb-1',
      type: 'cobb1',
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 100, y: 260 },
        { x: 200, y: 280 },
      ],
    }),
  ]);
});

it('preserves an existing keypoint-derived Cobb number when manual Cobb measurements exist', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'vertebrae-derived-cobb-lumbar',
      type: 'cobb1',
      value: '12.00°',
      points: [
        { x: 50, y: 80 },
        { x: 150, y: 80 },
        { x: 150, y: 220 },
        { x: 250, y: 260 },
      ],
      upperVertebra: 'L4',
      lowerVertebra: 'L5',
      apexVertebra: 'L4',
    },
    {
      id: 'manual-cobb-2',
      type: 'cobb2',
      value: '8.00°',
      points: [
        { x: 300, y: 100 },
        { x: 400, y: 100 },
        { x: 300, y: 200 },
        { x: 400, y: 210 },
      ],
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
    },
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements,
    keypoints: l4L5LumbarCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt.find(measurement => measurement.id === 'manual-cobb-2')).toEqual(
    expect.objectContaining({
      type: 'cobb2',
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
    })
  );
  expect(
    rebuilt.find(
      measurement => measurement.id === 'vertebrae-derived-cobb-lumbar'
    )
  ).toEqual(
    expect.objectContaining({
      type: 'cobb1',
      upperVertebra: 'L4',
      lowerVertebra: 'L5',
    })
  );
});

it('derives AP TS measurements from C7 corners', () => {
  const measurements = deriveKeypointMeasurements({
    keypoints: [
      apCorner('C7-1', 10, 10),
      apCorner('C7-2', 20, 10),
      apCorner('C7-3', 10, 30),
      apCorner('C7-4', 20, 30),
      apCorner('T1-1', 100, 100),
      apCorner('T1-2', 120, 100),
      apCorner('T1-3', 100, 140),
      apCorner('T1-4', 120, 140),
      apCorner('SR', 40, 200),
      apCorner('SL', 20, 200),
    ],
    cfhAnnotation: null,
    examType: '正位X光片',
    calculationContext,
  });

  const ts = measurements.find(measurement => measurement.type === 'TS');

  expect(ts?.points.slice(0, 4)).toEqual([
    { x: 10, y: 10 },
    { x: 20, y: 10 },
    { x: 10, y: 30 },
    { x: 20, y: 30 },
  ]);
});

it('derives lateral vertebra measurements from keypoint label order', () => {
  const measurements = deriveKeypointMeasurements({
    keypoints: [
      apCorner('T1-1', 10, 10),
      apCorner('T1-2', 30, 8),
      apCorner('T1-3', 12, 32),
      apCorner('T1-4', 32, 30),
    ],
    cfhAnnotation: null,
    examType: '侧位X光片',
    calculationContext,
  });

  expect(measurements.find(measurement => measurement.type === 'T1 Slope')).toEqual(
    expect.objectContaining({
      points: [
        { x: 30, y: 8 },
        { x: 10, y: 10 },
      ],
    })
  );
});

it('derives lateral LL L1-S1 with vertebra endpoints right-to-left and keeps S1 order', () => {
  const measurements = deriveKeypointMeasurements({
    keypoints: [
      apCorner('L1-1', 100, 100),
      apCorner('L1-2', 200, 100),
      apCorner('L1-3', 100, 140),
      apCorner('L1-4', 200, 140),
      apCorner('S1-1', 220, 250),
      apCorner('S1-2', 120, 240),
    ],
    cfhAnnotation: null,
    examType: '侧位X光片',
    calculationContext,
  });

  expect(measurements.find(measurement => measurement.type === 'LL L1-S1')).toEqual(
    expect.objectContaining({
      points: [
        { x: 200, y: 100 },
        { x: 100, y: 100 },
        { x: 220, y: 250 },
        { x: 120, y: 240 },
      ],
    })
  );
});

it('replaces first-pass AI Cobb measurements with numbered keypoint-derived Cobb measurements', () => {
  const firstPassCobb: MeasurementData[] = [
    {
      id: 'ai-cobb-1',
      type: 'cobb1',
      value: '20.00°',
      points: [],
      upperVertebra: 'T12',
      lowerVertebra: 'L1',
    },
  ];
  const keypoints: KeypointAnnotation[] = [
    apCorner('T12-1', 100, 100),
    apCorner('T12-2', 200, 100),
    apCorner('T12-3', 100, 130),
    apCorner('T12-4', 200, 130),
    apCorner('L1-1', 180, 180),
    apCorner('L1-2', 280, 180),
    apCorner('L1-3', 160, 230),
    apCorner('L1-4', 260, 266),
  ];

  const rebuilt = rebuildKeypointMeasurements({
    previousMeasurements: firstPassCobb,
    keypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(['ai-cobb-1']),
  });

  expect(rebuilt.map(measurement => measurement.type)).toEqual(['cobb1']);
  expect(rebuilt[0].upperVertebra).toBe('T12');
  expect(rebuilt[0].lowerVertebra).toBe('L1');
});
