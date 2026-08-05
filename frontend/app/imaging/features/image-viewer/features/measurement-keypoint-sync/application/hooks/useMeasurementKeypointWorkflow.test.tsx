import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useMeasurementKeypointWorkflow } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/hooks/useMeasurementKeypointWorkflow';
import { useMeasurementWorkflow } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/hooks/useMeasurementWorkflow';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  AnnotationSource,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

type Workflow = ReturnType<typeof useMeasurementKeypointWorkflow>;
type MeasurementWorkflow = ReturnType<typeof useMeasurementWorkflow>;
type WorkflowHarnessValue = {
  workflow: Workflow;
  measurementWorkflow: MeasurementWorkflow;
  measurements: MeasurementData[];
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
};

const calculationContext: CalculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};

function apKeypoint(id: string, x: number, y: number): KeypointAnnotation {
  return {
    id,
    point: { x, y },
    source: AnnotationSource.AI,
    confidence: 1,
  };
}

function apGlobalCobbKeypoints(): KeypointAnnotation[] {
  return [
    apKeypoint('T1-1', 100, 100),
    apKeypoint('T1-2', 200, 100),
    apKeypoint('T1-3', 100, 140),
    apKeypoint('T1-4', 200, 140),
    apKeypoint('L5-1', 100, 260),
    apKeypoint('L5-2', 200, 260),
    apKeypoint('L5-3', 100, 300),
    apKeypoint('L5-4', 200, 336.397),
  ];
}

function isNumberedCobb(measurement: MeasurementData): boolean {
  return /^cobb\d+$/i.test(measurement.type);
}

function WorkflowHarness({
  onValue,
  examType = '正位X光片',
}: {
  onValue: (value: WorkflowHarnessValue) => void;
  examType?: string;
}) {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [standardDistance] = useState<number | null>(null);
  const [standardDistancePoints] = useState<Point[]>([]);
  const isLateralView = examType === '侧位X光片';
  const workflow = useMeasurementKeypointWorkflow({
    imageId: 'image-1',
    examType,
    imageNaturalSize: { width: 1000, height: 1000 },
    measurements,
    setMeasurements,
    standardDistance: null,
    calculationContext,
    canUseKeypoints: true,
    isLateralView,
    isKeypointExam: true,
    setSaveMessage: jest.fn(),
    setShowStandardDistanceWarning: jest.fn(),
  });
  const measurementWorkflow = useMeasurementWorkflow({
    examType,
    tools: [],
    measurements,
    setMeasurements,
    standardDistance,
    standardDistancePoints,
    imageNaturalSize: { width: 1000, height: 1000 },
    canUseKeypoints: true,
    isLateralView,
    isKeypointExam: true,
    keypoints: workflow.keypoints,
    setKeypoints: workflow.setKeypoints,
    activeVertebraeLayer: workflow.activeVertebraeLayer,
    setVertebraeLayer: workflow.setVertebraeLayer,
    cfhAnnotation: workflow.cfhAnnotation,
    setCfhAnnotation: workflow.setCfhAnnotation,
    recalculateKeypointMeasurements: workflow.recalculateExistingMeasurements,
  });

  useEffect(() => {
    onValue({ workflow, measurementWorkflow, measurements, setMeasurements });
  }, [measurementWorkflow, measurements, onValue, workflow]);

  return null;
}

it('keeps CFH synchronized without automatically creating PT after drawing PI', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      examType="侧位X光片"
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.measurementWorkflow.handleAddMeasurement('pi', [
      { x: 150, y: 80 },
      { x: 100, y: 220 },
      { x: 220, y: 210 },
    ]);
  });

  await waitFor(() => {
    expect(latest!.workflow.cfhAnnotation?.center).toEqual({ x: 150, y: 80 });
    expect(
      latest!.measurements.find(
        measurement => measurement.type.toLowerCase() === 'pi'
      )
    ).toBeDefined();
  });

  const pi = latest!.measurements.find(
    measurement => measurement.type.toLowerCase() === 'pi'
  )!;
  const movedPoint = { x: 170, y: 95 };
  const updatedPoints = [movedPoint, ...pi.points.slice(1)];

  act(() => {
    latest!.workflow.handleMeasurementWriteback(
      pi.type,
      0,
      movedPoint,
      pi.id,
      updatedPoints
    );
  });

  await waitFor(() => {
    const synchronizedPelvicMeasurements = latest!.measurements.filter(
      measurement => ['pi', 'pt'].includes(measurement.type.toLowerCase())
    );
    expect(
      latest!.workflow.keypoints.find(keypoint => keypoint.id === 'CFH')?.point
    ).toEqual(movedPoint);
    expect(latest!.workflow.cfhAnnotation?.center).toEqual(movedPoint);
    expect(
      synchronizedPelvicMeasurements.map(measurement =>
        measurement.type.toLowerCase()
      )
    ).toEqual(['pi']);
    expect(
      synchronizedPelvicMeasurements.every(
        measurement =>
          measurement.points[0].x === movedPoint.x &&
          measurement.points[0].y === movedPoint.y
      )
    ).toBe(true);
  });
});

it('deletes PI and PT together while preserving S1 points used by SS', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      examType="侧位X光片"
      onValue={value => {
        latest = value;
      }}
    />
  );
  await waitFor(() => expect(latest).not.toBeNull());

  act(() => {
    latest!.workflow.setKeypoints([
      apKeypoint('CFH', 150, 80),
      apKeypoint('S1-1', 100, 220),
      apKeypoint('S1-2', 220, 210),
    ]);
    latest!.setMeasurements([
      {
        id: 'pi',
        type: 'pi',
        value: '1°',
        points: [],
        keypointSynced: true,
      },
      {
        id: 'pt',
        type: 'pt',
        value: '1°',
        points: [],
        keypointSynced: true,
      },
      {
        id: 'ss',
        type: 'ss',
        value: '1°',
        points: [],
        keypointSynced: true,
      },
    ]);
  });

  await waitFor(() => expect(latest!.measurements).toHaveLength(3));
  act(() => latest!.workflow.handleMeasurementDelete('pi'));

  await waitFor(() => {
    expect(latest!.measurements.map(item => item.type)).toEqual(['ss']);
    expect(latest!.workflow.keypoints.map(item => item.id)).toEqual([
      'S1-1',
      'S1-2',
    ]);
  });
});

it.each(['正位X光片', '左侧曲位', '右侧曲位'])(
  'automatically binds completed Cobb endpoints without opening the detection layer for %s',
  async examType => {
    let latest: WorkflowHarnessValue | null = null;
    const measurement: MeasurementData = {
      id: 'manual-cobb-1',
      type: 'cobb1',
      value: '12.00°',
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 110 },
        { x: 120, y: 300 },
        { x: 220, y: 280 },
      ],
      upperVertebra: 'T5',
      lowerVertebra: null,
    };

    render(
      <WorkflowHarness
        examType={examType}
        onValue={value => {
          latest = value;
        }}
      />
    );

    await waitFor(() => {
      expect(latest).not.toBeNull();
    });

    act(() => {
      latest!.setMeasurements([measurement]);
    });

    await waitFor(() => {
      expect(latest!.measurements).toHaveLength(1);
    });

    act(() => {
      expect(
        latest!.workflow.handleCobbEndpointUpdate('manual-cobb-1', {
          lowerVertebra: 'T12',
        })
      ).toBe(true);
    });

    await waitFor(() => {
      expect(latest!.workflow.showVertebraeLayer).toBe(false);
      expect(
        Object.fromEntries(
          latest!.workflow.keypoints.map(keypoint => [
            keypoint.id,
            keypoint.point,
          ])
        )
      ).toEqual({
        'T5-1': measurement.points[0],
        'T5-2': measurement.points[1],
        'T12-3': measurement.points[2],
        'T12-4': measurement.points[3],
      });
      expect(latest!.measurements[0]).toEqual(
        expect.objectContaining({
          id: 'manual-cobb-1',
          upperVertebra: 'T5',
          lowerVertebra: 'T12',
          keypointSynced: true,
        })
      );
    });
  }
);

it('keeps a manually drawn CA and CL/CR keypoints synchronized both ways', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.measurementWorkflow.handleAddMeasurement('ca', [
      { x: 220, y: 100 },
      { x: 100, y: 90 },
    ]);
  });

  await waitFor(() => {
    expect(
      latest!.workflow.keypoints.find(keypoint => keypoint.id === 'CR')?.point
    ).toEqual({ x: 220, y: 100 });
    expect(
      latest!.workflow.keypoints.find(keypoint => keypoint.id === 'CL')?.point
    ).toEqual({ x: 100, y: 90 });
  });

  const movedLayer = latest!.workflow.activeVertebraeLayer.map(annotation =>
    annotation.label === 'CL'
      ? {
          ...annotation,
          corners: [
            { x: 80, y: 70 },
            { x: 80, y: 70 },
            { x: 80, y: 70 },
            { x: 80, y: 70 },
          ] as [Point, Point, Point, Point],
        }
      : annotation
  );

  act(() => {
    latest!.workflow.handleVertebraeUpdate(movedLayer);
  });

  await waitFor(() => {
    expect(
      latest!.measurements.find(measurement => measurement.type === 'ca')
        ?.points
    ).toEqual([
      { x: 80, y: 70 },
      { x: 220, y: 100 },
    ]);
  });
});

it('creates missing PO and CSS keypoints when the manual tools complete', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.measurementWorkflow.handleAddMeasurement('po', [
      { x: 260, y: 160 },
      { x: 120, y: 150 },
    ]);
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints.map(keypoint => keypoint.id)).toEqual(
      expect.arrayContaining(['IL', 'IR'])
    );
  });

  act(() => {
    latest!.measurementWorkflow.handleAddMeasurement('css', [
      { x: 300, y: 240 },
      { x: 100, y: 230 },
    ]);
  });

  await waitFor(() => {
    expect(
      Object.fromEntries(
        latest!.workflow.keypoints.map(keypoint => [
          keypoint.id,
          keypoint.point,
        ])
      )
    ).toEqual(
      expect.objectContaining({
        IL: { x: 120, y: 150 },
        IR: { x: 260, y: 160 },
        SL: { x: 100, y: 230 },
        SR: { x: 300, y: 240 },
      })
    );
    expect(
      latest!.measurements.map(measurement => measurement.type.toLowerCase())
    ).toEqual(expect.arrayContaining(['po', 'css']));
  });
});

it('creates AVT from the same keypoint snapshot that completes staged placement', async () => {
  let latest: WorkflowHarnessValue | null = null;
  const target = { type: 'vertebra', vertebra: 'T2' } as const;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const orderedKeypoints = [
    'C7-1',
    'C7-2',
    'C7-3',
    'C7-4',
    'T2-1',
    'T2-2',
    'T2-3',
    'T2-4',
  ];
  for (const [index, keypointId] of orderedKeypoints.entries()) {
    act(() => {
      latest!.workflow.handleAddAvtKeypoint(target, keypointId, {
        x: 100 + index * 10,
        y: 100 + index * 5,
      });
    });
    await waitFor(() => {
      expect(
        latest!.workflow.keypoints.some(keypoint => keypoint.id === keypointId)
      ).toBe(true);
    });
  }

  await waitFor(() => {
    const measurement = latest!.measurements.find(
      item => item.id === 'ap-keypoint-avt-t2'
    );
    expect(measurement?.points).toHaveLength(8);
    expect(measurement?.avtMetadata?.target).toEqual(target);
  });
});

it('hydrates the complete persisted layer before backfilling bound keypoints', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.workflow.restorePersistedKeypointState({
      examType: '正位X光片',
      measurements: [
        {
          id: 'po-1',
          type: 'po',
          value: '0.00°',
          points: [
            { x: 80, y: 300 },
            { x: 240, y: 300 },
          ],
        },
      ],
      vertebraeLayer: [
        {
          label: 'T4',
          corners: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 100, y: 160 },
            { x: 200, y: 160 },
          ],
          confidence: 0.9,
          source: AnnotationSource.AI,
        },
      ],
      cfhAnnotation: null,
    });
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints.map(keypoint => keypoint.id)).toEqual(
      expect.arrayContaining(['T4-1', 'T4-2', 'T4-3', 'T4-4', 'IL', 'IR'])
    );
  });

  expect(
    latest!.workflow.vertebraeLayer.map(annotation => annotation.label)
  ).toEqual(
    expect.arrayContaining(['T4-1', 'T4-2', 'T4-3', 'T4-4', 'IL', 'IR'])
  );
});

it('marks only moved AI keypoints as manual after keypoint-layer drag', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.workflow.setKeypoints([
      apKeypoint('T1-1', 100, 100),
      apKeypoint('T1-2', 200, 100),
      apKeypoint('T1-3', 100, 200),
      apKeypoint('T1-4', 200, 200),
    ]);
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints).toHaveLength(4);
  });

  const updatedLayer: VertebraAnnotation[] = [
    {
      label: 'T1',
      corners: [
        { x: 120, y: 120 },
        { x: 200, y: 100 },
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      confidence: 1,
      source: AnnotationSource.AI,
    },
  ];

  act(() => {
    latest!.workflow.handleVertebraeUpdate(updatedLayer);
  });

  await waitFor(() => {
    expect(
      latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-1')
        ?.source
    ).toBe(AnnotationSource.MANUAL);
  });

  expect(
    latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-2')?.source
  ).toBe(AnnotationSource.AI);
  expect(
    latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-3')?.source
  ).toBe(AnnotationSource.AI);
  expect(
    latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-4')?.source
  ).toBe(AnnotationSource.AI);
});

it('does not rebuild deleted AP Cobb measurements when hiding the detection layer', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    const initialKeypoints = apGlobalCobbKeypoints();
    latest!.workflow.setKeypoints(initialKeypoints);
    latest!.setMeasurements(
      latest!.workflow.deriveInitialMeasurementsFromKeypoints(initialKeypoints)
    );
    latest!.workflow.setShowVertebraeLayer(true);
  });

  await waitFor(() => {
    expect(latest!.measurements.some(isNumberedCobb)).toBe(true);
    expect(latest!.workflow.showVertebraeLayer).toBe(true);
  });

  for (const measurement of latest!.measurements.filter(isNumberedCobb)) {
    act(() => latest!.workflow.handleMeasurementDelete(measurement.id));
    await waitFor(() =>
      expect(latest!.measurements.some(item => item.id === measurement.id)).toBe(
        false
      )
    );
  }

  await waitFor(() => {
    expect(latest!.measurements.some(isNumberedCobb)).toBe(false);
  });

  act(() => {
    latest!.workflow.handleToggleVertebraeLayer();
  });

  await waitFor(() => {
    expect(latest!.workflow.showVertebraeLayer).toBe(false);
  });
  expect(latest!.measurements.some(isNumberedCobb)).toBe(false);
});

it('does not rebuild deleted AP Cobb measurements when keypoints are updated', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    const initialKeypoints = apGlobalCobbKeypoints();
    latest!.workflow.setKeypoints(initialKeypoints);
    latest!.setMeasurements(
      latest!.workflow.deriveInitialMeasurementsFromKeypoints(initialKeypoints)
    );
  });

  await waitFor(() => {
    expect(latest!.measurements.some(isNumberedCobb)).toBe(true);
  });

  for (const measurement of latest!.measurements.filter(isNumberedCobb)) {
    act(() => latest!.workflow.handleMeasurementDelete(measurement.id));
    await waitFor(() =>
      expect(latest!.measurements.some(item => item.id === measurement.id)).toBe(
        false
      )
    );
  }

  await waitFor(() => {
    expect(latest!.measurements.some(isNumberedCobb)).toBe(false);
  });

  const updatedLayer = latest!.workflow.activeVertebraeLayer.map(annotation =>
    annotation.label === 'T1'
      ? ({
          ...annotation,
          corners: [
            { x: annotation.corners[0].x + 10, y: annotation.corners[0].y },
            ...annotation.corners.slice(1),
          ] as [Point, Point, Point, Point],
        } satisfies VertebraAnnotation)
      : annotation
  );

  act(() => {
    latest!.workflow.handleVertebraeUpdate(updatedLayer);
  });

  await waitFor(() => {
    expect(latest!.measurements.some(isNumberedCobb)).toBe(false);
  });
});

it('does not create AP Cobb measurements from ordinary keypoint updates', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.workflow.setKeypoints(apGlobalCobbKeypoints());
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints).toHaveLength(8);
  });

  expect(latest!.measurements.some(isNumberedCobb)).toBe(false);
});

it('deletes all existing keypoints for a selected vertebra group', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.workflow.setKeypoints([
      apKeypoint('T1-1', 100, 100),
      apKeypoint('T1-2', 200, 100),
      apKeypoint('T1-3', 100, 140),
      apKeypoint('T1-4', 200, 140),
      apKeypoint('T10-1', 100, 300),
    ]);
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints).toHaveLength(5);
  });

  act(() => {
    latest!.workflow.handleKeypointGroupDelete('T1');
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints.map(keypoint => keypoint.id)).toEqual([
      'T10-1',
    ]);
  });
});

it('shifts keypoints and measurement vertebra fields together', async () => {
  let latest: WorkflowHarnessValue | null = null;

  render(
    <WorkflowHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.workflow.setKeypoints([
      apKeypoint('T1-1', 10, 20),
      apKeypoint('T2-1', 30, 40),
    ]);
    latest!.setMeasurements([
      {
        id: 'manual-measurement',
        type: 'manual-measurement',
        value: '0.00°',
        points: [],
        upperVertebra: 'T1',
        lowerVertebra: 'T2',
        apexVertebra: 'T1',
      },
    ]);
  });

  await waitFor(() => {
    expect(latest!.workflow.keypoints).toHaveLength(2);
    expect(latest!.measurements[0]?.upperVertebra).toBe('T1');
  });

  act(() => {
    latest!.workflow.handleApplyVertebraLabelOffset({
      startVertebra: 'T1',
      endVertebra: 'T2',
      direction: 'down',
      offset: 1,
    });
  });

  await waitFor(() => {
    const byId = new Map(
      latest!.workflow.keypoints.map(keypoint => [keypoint.id, keypoint])
    );
    expect(byId.get('T2-1')?.point).toEqual({ x: 10, y: 20 });
    expect(byId.get('T2-1')?.source).toBe(AnnotationSource.MANUAL);
    expect(byId.get('T3-1')?.point).toEqual({ x: 30, y: 40 });
    expect(byId.has('T1-1')).toBe(false);
    expect(latest!.measurements[0]).toEqual(
      expect.objectContaining({
        upperVertebra: 'T2',
        lowerVertebra: 'T3',
        apexVertebra: 'T2',
      })
    );
  });
});
