import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useKeypointMeasurementWorkflow } from '@/app/imaging/features/image-viewer/features/keypoints/hooks/useKeypointMeasurementWorkflow';
import { useMeasurementWorkflow } from '@/app/imaging/features/image-viewer/features/measurements/hooks/useMeasurementWorkflow';
import { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  AnnotationSource,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

type Workflow = ReturnType<typeof useKeypointMeasurementWorkflow>;
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
}: {
  onValue: (value: WorkflowHarnessValue) => void;
}) {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
  const [standardDistance] = useState<number | null>(null);
  const [standardDistancePoints] = useState<Point[]>([]);
  const workflow = useKeypointMeasurementWorkflow({
    imageId: 'image-1',
    examType: '正位X光片',
    imageNaturalSize: { width: 1000, height: 1000 },
    measurements,
    setMeasurements,
    standardDistance: null,
    calculationContext,
    canUseKeypoints: true,
    isLateralView: false,
    isKeypointExam: true,
    setSaveMessage: jest.fn(),
    setShowStandardDistanceWarning: jest.fn(),
  });
  const measurementWorkflow = useMeasurementWorkflow({
    examType: '正位X光片',
    tools: [],
    measurements,
    setMeasurements,
    selectedTool: 'hand',
    clickedPoints,
    setClickedPoints,
    standardDistance,
    standardDistancePoints,
    imageNaturalSize: { width: 1000, height: 1000 },
    calculationContext,
    setSaveMessage: jest.fn(),
    canUseKeypoints: true,
    isAnteriorView: true,
    isLateralView: false,
    isKeypointExam: true,
    keypoints: workflow.keypoints,
    setKeypoints: workflow.setKeypoints,
    activeVertebraeLayer: workflow.activeVertebraeLayer,
    setVertebraeLayer: workflow.setVertebraeLayer,
    cfhAnnotation: workflow.cfhAnnotation,
    setCfhAnnotation: workflow.setCfhAnnotation,
    syncUniqueKeypointMeasurements: workflow.syncUniqueMeasurements,
    deriveKeypointMeasurements: workflow.deriveKeypointMeasurements,
  });

  useEffect(() => {
    onValue({ workflow, measurementWorkflow, measurements, setMeasurements });
  }, [measurementWorkflow, measurements, onValue, workflow]);

  return null;
}

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
    latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-2')
      ?.source
  ).toBe(AnnotationSource.AI);
  expect(
    latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-3')
      ?.source
  ).toBe(AnnotationSource.AI);
  expect(
    latest!.workflow.keypoints.find(keypoint => keypoint.id === 'T1-4')
      ?.source
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

  act(() => {
    latest!.measurements
      .filter(isNumberedCobb)
      .forEach(measurement =>
        latest!.measurementWorkflow.handleMeasurementDelete(measurement.id)
      );
  });

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

  act(() => {
    latest!.measurements
      .filter(isNumberedCobb)
      .forEach(measurement =>
        latest!.measurementWorkflow.handleMeasurementDelete(measurement.id)
      );
  });

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
