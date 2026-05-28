import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useKeypointMeasurementWorkflow } from '@/app/imaging/features/image-viewer/features/keypoints/hooks/useKeypointMeasurementWorkflow';
import { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  AnnotationSource,
  MeasurementData,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

type Workflow = ReturnType<typeof useKeypointMeasurementWorkflow>;

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

function WorkflowHarness({ onValue }: { onValue: (value: Workflow) => void }) {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
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

  useEffect(() => {
    onValue(workflow);
  }, [onValue, workflow]);

  return null;
}

it('marks only moved AI keypoints as manual after keypoint-layer drag', async () => {
  let latest: Workflow | null = null;

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
    latest!.setKeypoints([
      apKeypoint('T1-1', 100, 100),
      apKeypoint('T1-2', 200, 100),
      apKeypoint('T1-3', 100, 200),
      apKeypoint('T1-4', 200, 200),
    ]);
  });

  await waitFor(() => {
    expect(latest!.keypoints).toHaveLength(4);
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
    latest!.handleVertebraeUpdate(updatedLayer);
  });

  await waitFor(() => {
    expect(
      latest!.keypoints.find(keypoint => keypoint.id === 'T1-1')?.source
    ).toBe(AnnotationSource.MANUAL);
  });

  expect(
    latest!.keypoints.find(keypoint => keypoint.id === 'T1-2')?.source
  ).toBe(AnnotationSource.AI);
  expect(
    latest!.keypoints.find(keypoint => keypoint.id === 'T1-3')?.source
  ).toBe(AnnotationSource.AI);
  expect(
    latest!.keypoints.find(keypoint => keypoint.id === 'T1-4')?.source
  ).toBe(AnnotationSource.AI);
});
