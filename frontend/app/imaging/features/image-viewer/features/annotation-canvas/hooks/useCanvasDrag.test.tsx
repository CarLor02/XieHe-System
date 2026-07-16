import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useCanvasDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDrag';
import { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import { SelectionState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/types';
import { createHemipelvicWidthRatioPoints } from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

type CanvasDragHook = ReturnType<typeof useCanvasDrag>;

function DragHarness({
  onValue,
  onAnnotationDragStart,
}: {
  onValue: (value: CanvasDragHook) => void;
  onAnnotationDragStart: () => void;
}) {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([
    {
      id: 'measurement-1',
      type: 'aux-length',
      value: '0.00mm',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    },
  ]);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    measurementId: 'measurement-1',
    pointIndex: 0,
    type: 'point',
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  });
  const value = useCanvasDrag({
    selectedTool: 'hand',
    selectionState,
    setSelectionState,
    measurements,
    clickedPoints: [],
    setClickedPoints: jest.fn(),
    pointBindings: { syncGroups: [] },
    standardDistance: null,
    standardDistancePoints: [],
    imageNaturalSize: { width: 1000, height: 1000 },
    imageScale: 1,
    onMeasurementsUpdate: setMeasurements,
    imageToScreen: point => point,
    screenToImage: (screenX, screenY) => ({ x: screenX, y: screenY }),
    referenceLines: { t1Tilt: null },
    setReferenceLines: jest.fn(),
    onAnnotationDragStart,
  });

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

it('starts annotation history only once for one measurement drag', async () => {
  let latest: CanvasDragHook | null = null;
  const onAnnotationDragStart = jest.fn();

  render(
    <DragHarness
      onValue={value => {
        latest = value;
      }}
      onAnnotationDragStart={onAnnotationDragStart}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    expect(latest!.handleMouseMove(5, 5, 1)).toBe(true);
  });
  await waitFor(() => {
    expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
  });

  act(() => {
    expect(latest!.handleMouseMove(6, 6, 1)).toBe(true);
  });

  expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
});

function HemipelvicLineDragHarness({
  onValue,
  onMeasurementsChange,
  onAnnotationDragStart,
}: {
  onValue: (value: CanvasDragHook) => void;
  onMeasurementsChange: (measurements: MeasurementData[]) => void;
  onAnnotationDragStart: () => void;
}) {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([
    {
      id: 'lr-1',
      type: 'hemipelvic-width-ratio',
      value: '1.00',
      points: createHemipelvicWidthRatioPoints([
        { x: 0, y: 100 },
        { x: 10, y: 100 },
        { x: 20, y: 100 },
        { x: 30, y: 100 },
      ]),
    },
  ]);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    measurementId: 'lr-1',
    pointIndex: 0,
    type: 'line',
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  });
  const value = useCanvasDrag({
    selectedTool: 'hand',
    selectionState,
    setSelectionState,
    measurements,
    clickedPoints: [],
    setClickedPoints: jest.fn(),
    pointBindings: { syncGroups: [] },
    standardDistance: null,
    standardDistancePoints: [],
    imageNaturalSize: { width: 1000, height: 1000 },
    imageScale: 1,
    onMeasurementsUpdate: setMeasurements,
    imageToScreen: point => point,
    screenToImage: (screenX, screenY) => ({ x: screenX, y: screenY }),
    referenceLines: { t1Tilt: null },
    setReferenceLines: jest.fn(),
    onAnnotationDragStart,
  });

  useEffect(() => {
    onValue(value);
    onMeasurementsChange(measurements);
  }, [measurements, onMeasurementsChange, onValue, value]);

  return null;
}

it('moves one L/R line horizontally and recalculates the ratio', async () => {
  let latest: CanvasDragHook | null = null;
  let latestMeasurements: MeasurementData[] = [];
  const onAnnotationDragStart = jest.fn();

  render(
    <HemipelvicLineDragHarness
      onValue={value => {
        latest = value;
      }}
      onMeasurementsChange={measurements => {
        latestMeasurements = measurements;
      }}
      onAnnotationDragStart={onAnnotationDragStart}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    expect(latest!.handleMouseMove(5, 100, 1)).toBe(true);
  });

  await waitFor(() => {
    expect(latestMeasurements[0]?.value).toBe('0.50');
  });
  expect(latestMeasurements[0].points[0].x).toBe(5);
  expect(latestMeasurements[0].points[4].x).toBe(5);
  expect(latestMeasurements[0].points[5].x).toBe(5);
  expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
});
