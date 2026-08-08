import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useCanvasDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasDrag';
import { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import { SelectionState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';
import { createHemipelvicWidthRatioPoints } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/hemipelvic-width-ratio';
import { createEmptyBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';

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
    pointBindings: createEmptyBindings(),
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
    expect(latest!.updateInteraction(5, 5, true, 0)).toBe(true);
  });
  await waitFor(() => {
    expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
  });

  act(() => {
    expect(latest!.updateInteraction(6, 6, true, 0)).toBe(true);
  });

  expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
});

it('does not mutate a selected measurement below the pointer drag threshold', async () => {
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
    latest!.beginInteraction(0, 0);
    expect(latest!.updateInteraction(3, 3, true, 6)).toBe(true);
  });
  expect(onAnnotationDragStart).not.toHaveBeenCalled();

  act(() => {
    expect(latest!.updateInteraction(10, 10, true, 6)).toBe(true);
  });
  await waitFor(() => {
    expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
  });
});

function HemipelvicLineDragHarness({
  onValue,
  onMeasurementsChange,
  onAnnotationDragStart,
  onMeasurementWriteback,
}: {
  onValue: (value: CanvasDragHook) => void;
  onMeasurementsChange: (measurements: MeasurementData[]) => void;
  onAnnotationDragStart: () => void;
  onMeasurementWriteback: jest.Mock;
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
    pointBindings: createEmptyBindings(),
    standardDistance: null,
    standardDistancePoints: [],
    imageNaturalSize: { width: 1000, height: 1000 },
    imageScale: 1,
    onMeasurementsUpdate: setMeasurements,
    onMeasurementWriteback: (...args) => {
      onMeasurementWriteback(...args);
      return false;
    },
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
  const onMeasurementWriteback = jest.fn();

  render(
    <HemipelvicLineDragHarness
      onValue={value => {
        latest = value;
      }}
      onMeasurementsChange={measurements => {
        latestMeasurements = measurements;
      }}
      onAnnotationDragStart={onAnnotationDragStart}
      onMeasurementWriteback={onMeasurementWriteback}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    expect(latest!.updateInteraction(5, 100, true, 0)).toBe(true);
  });

  await waitFor(() => {
    expect(latestMeasurements[0]?.value).toBe('0.50');
  });
  expect(latestMeasurements[0].points[0].x).toBe(5);
  expect(latestMeasurements[0].points[4].x).toBe(5);
  expect(latestMeasurements[0].points[5].x).toBe(5);
  expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
  expect(onMeasurementWriteback).toHaveBeenLastCalledWith(
    'hemipelvic-width-ratio',
    0,
    { x: 5, y: 100 },
    'lr-1',
    latestMeasurements[0].points,
    expect.any(Array)
  );
});

function EffectiveCfhDragHarness({
  onValue,
  onMeasurementsChange,
  onMeasurementWriteback,
}: {
  onValue: (value: CanvasDragHook) => void;
  onMeasurementsChange: (measurements: MeasurementData[]) => void;
  onMeasurementWriteback: jest.Mock;
}) {
  const initialPoints = [
    { x: 10, y: 20 },
    { x: 30, y: 20 },
    { x: 70, y: 40 },
    { x: 70, y: 70 },
    { x: 20, y: 100 },
    { x: 80, y: 100 },
  ];
  const [measurements, setMeasurements] = useState<MeasurementData[]>(
    (['PI', 'PT'] as const).map(type => ({
      id: type.toLowerCase(),
      type,
      value: '0.00°',
      points: initialPoints.map(point => ({ ...point })),
      pelvicMetadata: {
        schemaVersion: 2,
        femoralHeadMode: 'bilateral',
      },
    }))
  );
  const [selectionState, setSelectionState] = useState<SelectionState>({
    measurementId: 'pi',
    pointIndex: null,
    type: 'effective-cfh',
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
    pointBindings: createEmptyBindings(),
    standardDistance: null,
    standardDistancePoints: [],
    imageNaturalSize: { width: 1000, height: 1000 },
    imageScale: 1,
    onMeasurementsUpdate: setMeasurements,
    onMeasurementWriteback: (...args) => {
      onMeasurementWriteback(...args);
      return false;
    },
    imageToScreen: point => point,
    screenToImage: (screenX, screenY) => ({ x: screenX, y: screenY }),
    referenceLines: { t1Tilt: null },
    setReferenceLines: jest.fn(),
  });

  useEffect(() => {
    onValue(value);
    onMeasurementsChange(measurements);
  }, [measurements, onMeasurementsChange, onValue, value]);

  return null;
}

it('moves both bilateral FH circles through the derived CFH handle', async () => {
  let latest: CanvasDragHook | null = null;
  let latestMeasurements: MeasurementData[] = [];
  const onMeasurementWriteback = jest.fn();

  render(
    <EffectiveCfhDragHarness
      onValue={value => {
        latest = value;
      }}
      onMeasurementsChange={measurements => {
        latestMeasurements = measurements;
      }}
      onMeasurementWriteback={onMeasurementWriteback}
    />
  );
  await waitFor(() => expect(latest).not.toBeNull());

  act(() => {
    expect(latest!.updateInteraction(50, 40, true, 0)).toBe(true);
  });

  await waitFor(() => {
    expect(latestMeasurements[0].points).toEqual([
      { x: 20, y: 30 },
      { x: 40, y: 30 },
      { x: 80, y: 50 },
      { x: 80, y: 80 },
      { x: 20, y: 100 },
      { x: 80, y: 100 },
    ]);
  });
  expect(latestMeasurements[1].points).toEqual(latestMeasurements[0].points);
  expect(onMeasurementWriteback).toHaveBeenLastCalledWith(
    'PI',
    [0, 2],
    { x: 50, y: 40 },
    'pi',
    latestMeasurements[0].points,
    expect.any(Array)
  );
});

function TtsLineDragHarness({
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
      id: 'manual-tts',
      type: 'tts',
      value: '-9.00mm',
      keypointSynced: true,
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 40, y: 100 },
        { x: 60, y: 100 },
      ],
    },
  ]);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    measurementId: 'manual-tts',
    pointIndex: null,
    type: 'whole',
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
    pointBindings: createEmptyBindings(),
    standardDistance: null,
    standardDistancePoints: [],
    imageNaturalSize: { width: 1000, height: 1000 },
    imageScale: 1,
    onMeasurementsUpdate: setMeasurements,
    disableWholeDrag: true,
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

it('moves a bound manual TTS trunk line despite whole-drag restrictions', async () => {
  let latest: CanvasDragHook | null = null;
  let latestMeasurements: MeasurementData[] = [];
  const onAnnotationDragStart = jest.fn();

  render(
    <TtsLineDragHarness
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
    expect(latest!.updateInteraction(25, 35, true, 0)).toBe(true);
  });

  await waitFor(() => {
    expect(latestMeasurements[0].points.slice(0, 2)).toEqual([
      { x: 10, y: 35 },
      { x: 30, y: 35 },
    ]);
  });
  expect(latestMeasurements[0].points.slice(2)).toEqual([
    { x: 40, y: 100 },
    { x: 60, y: 100 },
  ]);
  expect(latestMeasurements[0].value).toBe('-9.00mm');

  act(() => {
    expect(latest!.updateInteraction(30, 40, true, 0)).toBe(true);
  });

  await waitFor(() => {
    expect(latestMeasurements[0].points.slice(0, 2)).toEqual([
      { x: 10, y: 40 },
      { x: 30, y: 40 },
    ]);
  });
  expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
});
