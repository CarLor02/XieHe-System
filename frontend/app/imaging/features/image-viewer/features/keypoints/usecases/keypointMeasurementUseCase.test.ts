import { expect, it } from '@jest/globals';

import { getApKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import {
  createAvtMeasurement,
  createNextBoundCobbMeasurement,
  deriveKeypointMeasurements,
  deriveInitialMeasurementsFromKeypoints,
  hasAvtMeasurementForApex,
  hasCobbMeasurementForEndpoints,
  recalculateExistingMeasurementsFromKeypoints,
  syncUniqueMeasurementsAfterKeypointChange,
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

function t1L5GlobalCobbKeypoints(): KeypointAnnotation[] {
  return [
    apCorner('T1-1', 100, 100),
    apCorner('T1-2', 200, 100),
    apCorner('T1-3', 100, 140),
    apCorner('T1-4', 200, 140),
    apCorner('L5-1', 100, 260),
    apCorner('L5-2', 200, 260),
    apCorner('L5-3', 100, 300),
    apCorner('L5-4', 200, 336.397),
  ];
}

const calculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};

function multipleAvtKeypoints(): KeypointAnnotation[] {
  return [
    apCorner('T1-1', 100, 100),
    apCorner('T1-2', 200, 100),
    apCorner('T1-3', 100, 140),
    apCorner('T1-4', 200, 140),
    apCorner('T2-1', 120, 180),
    apCorner('T2-2', 220, 180),
    apCorner('T2-3', 120, 220),
    apCorner('T2-4', 220, 220),
    apCorner('SR', 300, 400),
    apCorner('SL', 200, 400),
  ];
}

it('includes L5 in AP keypoint groups and complete AP render layers', () => {
  const groups = getApKeypointGroups();
  const l5Group = groups.find(group => group.id === 'L5');
  const poseGroup = groups.find(group => group.id === 'pose');
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
  expect(poseGroup?.keypoints.map(keypoint => keypoint.id)).toEqual(
    expect.arrayContaining(['ASIS_L', 'SI_L', 'SI_R', 'ASIS_R'])
  );
});

it('derives initial AP Cobb measurements from global endpoint candidates', () => {
  const rebuilt = deriveInitialMeasurementsFromKeypoints({
    previousMeasurements: [],
    keypoints: t1L5GlobalCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt.find(measurement => measurement.type === 'cobb1')).toEqual(
    expect.objectContaining({
      upperVertebra: 'T1',
      lowerVertebra: 'L5',
      apexVertebra: null,
    })
  );
});

it('does not create a new Cobb while only recalculating existing measurements', () => {
  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements: [],
    keypoints: t1L5GlobalCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt.some(measurement => /^cobb\d+$/i.test(measurement.type))).toBe(
    false
  );
});

it('recalculates a manual CA from CL and CR without relying on its id source', () => {
  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements: [
      {
        id: 'manual-ca',
        type: 'ca',
        value: '0.00°',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      },
    ],
    keypoints: [apCorner('CR', 240, 120), apCorner('CL', 100, 80)],
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([
    expect.objectContaining({
      id: 'manual-ca',
      type: 'ca',
      points: [
        { x: 240, y: 120 },
        { x: 100, y: 80 },
      ],
      keypointSynced: true,
    }),
  ]);
});

it('automatically derives one L/R measurement when all four pose keypoints exist', () => {
  const synced = syncUniqueMeasurementsAfterKeypointChange({
    previousMeasurements: [],
    keypoints: [
      apCorner('ASIS_L', 100, 100),
      apCorner('SI_L', 200, 100),
      apCorner('SI_R', 300, 100),
      apCorner('ASIS_R', 400, 100),
    ],
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(synced).toEqual([
    expect.objectContaining({
      type: 'hemipelvic-width-ratio',
      keypointSynced: true,
      points: expect.arrayContaining([
        { x: 100, y: 100 },
        { x: 400, y: 100 },
      ]),
    }),
  ]);
  expect(synced[0].points).toHaveLength(12);
});

it('removes a keypoint-bound L/R measurement when one dependency is deleted', () => {
  const completeKeypoints = [
    apCorner('ASIS_L', 100, 100),
    apCorner('SI_L', 200, 100),
    apCorner('SI_R', 300, 100),
    apCorner('ASIS_R', 400, 100),
  ];
  const [derived] = syncUniqueMeasurementsAfterKeypointChange({
    previousMeasurements: [],
    keypoints: completeKeypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  const synced = syncUniqueMeasurementsAfterKeypointChange({
    previousMeasurements: [derived],
    keypoints: completeKeypoints.filter(item => item.id !== 'SI_R'),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(synced).toEqual([]);
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

  const rebuilt = deriveInitialMeasurementsFromKeypoints({
    previousMeasurements,
    keypoints: t1L5GlobalCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(
    rebuilt
      .map(measurement => measurement.type)
      .filter(type => /^cobb\d+$/i.test(type))
  ).toEqual(['cobb1', 'cobb3', 'cobb4']);
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
      type: 'lateral-cobb1',
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      keypointSynced: true,
      points: [
        { x: 10, y: 30 },
        { x: 30, y: 30 },
        { x: 20, y: 130 },
        { x: 50, y: 130 },
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
    { x: 100, y: 100 },
    { x: 180, y: 110 },
    { x: 120, y: 240 },
    { x: 220, y: 250 },
  ]);
});

it('recalculates a lateral keypoint-synced Cobb with lateral endpoint rules', () => {
  const previousMeasurements: MeasurementData[] = [
    {
      id: 'manual-lateral-cobb',
      type: 'lateral-cobb1',
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

  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
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
        { x: 30, y: 30 },
        { x: 40, y: 30 },
        { x: 70, y: 100 },
        { x: 80, y: 100 },
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

it('recalculates a keypoint-synced manual Cobb measurement when endpoint keypoints move', () => {
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

  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
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

  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
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

it('creates stable AVT ids per apex and preserves a historical id', () => {
  const keypoints = multipleAvtKeypoints();
  const t1 = createAvtMeasurement({
    apexVertebra: 'T1',
    keypoints,
    calculationContext,
  });
  const historical = createAvtMeasurement({
    apexVertebra: 'T2',
    keypoints,
    calculationContext,
    existingMeasurement: {
      id: 'ap-keypoint-avt',
      type: 'avt',
      value: '0.00mm',
      points: [],
      apexVertebra: 'T2',
    },
  });

  expect(t1?.id).toBe('ap-keypoint-avt-t1');
  expect(historical?.id).toBe('ap-keypoint-avt');
  expect(hasAvtMeasurementForApex([t1!], 't1')).toBe(true);
  expect(hasAvtMeasurementForApex([t1!], 'T2')).toBe(false);
});

it('rebuilds multiple AVT measurements without changing their ids', () => {
  const keypoints = multipleAvtKeypoints();
  const previousMeasurements = [
    createAvtMeasurement({
      apexVertebra: 'T1',
      keypoints,
      calculationContext,
      existingMeasurement: {
        id: 'ap-keypoint-avt',
        type: 'avt',
        value: '0.00mm',
        points: [],
        apexVertebra: 'T1',
      },
    })!,
    createAvtMeasurement({
      apexVertebra: 'T2',
      keypoints,
      calculationContext,
    })!,
  ];
  const movedKeypoints = keypoints.map(keypoint =>
    keypoint.id === 'SR'
      ? { ...keypoint, point: { x: 340, y: 410 } }
      : keypoint
  );

  const rebuilt = deriveInitialMeasurementsFromKeypoints({
    previousMeasurements,
    keypoints: movedKeypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(
    rebuilt
      .filter(measurement => measurement.type === 'avt')
      .map(measurement => measurement.id)
  ).toEqual(['ap-keypoint-avt', 'ap-keypoint-avt-t2']);
  expect(
    rebuilt
      .filter(measurement => measurement.type === 'avt')
      .map(measurement => measurement.points[4])
  ).toEqual([
    { x: 340, y: 410 },
    { x: 340, y: 410 },
  ]);
});

it('removes only the AVT whose apex keypoints are missing', () => {
  const keypoints = multipleAvtKeypoints();
  const previousMeasurements = [
    createAvtMeasurement({
      apexVertebra: 'T1',
      keypoints,
      calculationContext,
    })!,
    createAvtMeasurement({
      apexVertebra: 'T2',
      keypoints,
      calculationContext,
    })!,
  ];
  const withoutT1 = keypoints.filter(
    keypoint => !keypoint.id.startsWith('T1-')
  );

  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements,
    keypoints: withoutT1,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(
    rebuilt
      .filter(measurement => measurement.type === 'avt')
      .map(measurement => measurement.apexVertebra)
  ).toEqual(['T2']);
});

it('removes all AVT measurements when a sacral reference point is missing', () => {
  const keypoints = multipleAvtKeypoints();
  const previousMeasurements = [
    createAvtMeasurement({
      apexVertebra: 'T1',
      keypoints,
      calculationContext,
    })!,
    createAvtMeasurement({
      apexVertebra: 'T2',
      keypoints,
      calculationContext,
    })!,
  ];

  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements,
    keypoints: keypoints.filter(keypoint => keypoint.id !== 'SR'),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(
    rebuilt.some(measurement => measurement.type === 'avt')
  ).toBe(false);
});

it('updates a bound manual TTS from moved SR and SL keypoints', () => {
  const measurement: MeasurementData = {
    id: 'manual-tts',
    type: 'tts',
    value: '-10.00mm',
    keypointSynced: true,
    points: [
      { x: 100, y: 50 },
      { x: 180, y: 50 },
      { x: 300, y: 200 },
      { x: 200, y: 200 },
    ],
  };

  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements: [measurement],
    keypoints: [apCorner('SR', 320, 210), apCorner('SL', 190, 205)],
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([
    expect.objectContaining({
      id: 'manual-tts',
      type: 'tts',
      keypointSynced: true,
      points: [
        { x: 100, y: 50 },
        { x: 180, y: 50 },
        { x: 320, y: 210 },
        { x: 190, y: 205 },
      ],
    }),
  ]);
});

it('removes a bound manual TTS when SR or SL is missing', () => {
  const rebuilt = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements: [
      {
        id: 'manual-tts',
        type: 'tts',
        value: '-10.00mm',
        keypointSynced: true,
        points: [
          { x: 100, y: 50 },
          { x: 180, y: 50 },
          { x: 300, y: 200 },
          { x: 200, y: 200 },
        ],
      },
    ],
    keypoints: [apCorner('SR', 320, 210)],
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(rebuilt).toEqual([]);
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
        { x: 10, y: 10 },
        { x: 30, y: 8 },
      ],
    })
  );
});

it('derives lateral LL L1-S1 with vertebra and S1 endpoints left-to-right', () => {
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
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 120, y: 240 },
        { x: 220, y: 250 },
      ],
    })
  );
});

it('derives lateral SS from S1 keypoints in left-to-right display order', () => {
  const measurements = deriveKeypointMeasurements({
    keypoints: [
      apCorner('S1-1', 120, 240),
      apCorner('S1-2', 220, 250),
    ],
    cfhAnnotation: null,
    examType: '侧位X光片',
    calculationContext,
  });

  expect(measurements.find(measurement => measurement.type === 'SS')).toEqual(
    expect.objectContaining({
      points: [
        { x: 120, y: 240 },
        { x: 220, y: 250 },
      ],
    })
  );
});

it('replaces first-pass AI Cobb measurements with numbered initial keypoint-derived Cobb measurements', () => {
  const firstPassCobb: MeasurementData[] = [
    {
      id: 'ai-cobb-1',
      type: 'cobb1',
      value: '20.00°',
      points: [],
      upperVertebra: 'T1',
      lowerVertebra: 'L5',
    },
  ];
  const keypoints = t1L5GlobalCobbKeypoints();

  const rebuilt = deriveInitialMeasurementsFromKeypoints({
    previousMeasurements: firstPassCobb,
    keypoints,
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(['ai-cobb-1']),
  });

  const cobb = rebuilt.find(measurement => measurement.type === 'cobb1');
  expect(cobb?.upperVertebra).toBe('T1');
  expect(cobb?.lowerVertebra).toBe('L5');
});

it('syncs globally unique measurements after keypoint changes without adding Cobb', () => {
  const synced = syncUniqueMeasurementsAfterKeypointChange({
    previousMeasurements: [],
    keypoints: t1L5GlobalCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(synced.find(measurement => measurement.type === 'T1 Tilt')).toEqual(
    expect.objectContaining({
      type: 'T1 Tilt',
    })
  );
  expect(synced.some(measurement => /^cobb\d*$/i.test(measurement.type))).toBe(
    false
  );
});

it('removes globally unique measurements when keypoint dependencies are missing', () => {
  const synced = syncUniqueMeasurementsAfterKeypointChange({
    previousMeasurements: [
      {
        id: 'vertebrae-derived-t1-tilt',
        type: 'T1 Tilt',
        value: '5.00°',
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ],
      },
    ],
    keypoints: l4L5LumbarCobbKeypoints(),
    cfhAnnotation: null,
    examType: '正位X光片',
    isLateralView: false,
    calculationContext,
    aiMeasurementIds: new Set(),
  });

  expect(synced.find(measurement => measurement.type === 'T1 Tilt')).toBeUndefined();
});
