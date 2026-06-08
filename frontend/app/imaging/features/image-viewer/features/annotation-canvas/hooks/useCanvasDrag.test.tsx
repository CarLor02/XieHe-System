import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useCanvasDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDrag';
import { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import { SelectionState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/types';

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
