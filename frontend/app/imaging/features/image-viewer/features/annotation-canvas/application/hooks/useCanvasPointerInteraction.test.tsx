import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { expect, it, jest } from '@jest/globals';

import { useCanvasDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasDrag';
import { useCanvasPointerInteraction } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasPointerInteraction';
import { getCanvasPointerPolicy } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/input/pointer-input';
import type { CanvasPointerInput } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/input/pointer-input';
import type {
  HoverState,
  SelectionState,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';
import { createEmptyBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';

const INITIAL_TPA_POINTS: Point[] = [
  { x: 10, y: 10 },
  { x: 30, y: 10 },
  { x: 10, y: 30 },
  { x: 30, y: 30 },
  { x: 100, y: 200 },
  { x: 120, y: 200 },
  { x: 200, y: 240 },
  { x: 220, y: 240 },
  { x: 120, y: 400 },
  { x: 240, y: 400 },
];

function pointerInput(x: number, y: number): CanvasPointerInput {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    clientPoint: { x, y },
    screenPoint: { x, y },
    primaryActionPressed: true,
    policy: getCanvasPointerPolicy('mouse'),
  };
}

interface HarnessValue {
  pointer: ReturnType<typeof useCanvasPointerInteraction>;
  measurements: MeasurementData[];
  selectionState: SelectionState;
}

function TpaEffectiveCfhPointerHarness({
  onValue,
}: {
  onValue: (value: HarnessValue) => void;
}) {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([
    {
      id: 'tpa-bilateral',
      type: 'TPA',
      value: '20.00°',
      points: INITIAL_TPA_POINTS.map(point => ({ ...point })),
      pelvicMetadata: {
        schemaVersion: 2,
        femoralHeadMode: 'bilateral',
      },
    },
  ]);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    measurementId: null,
    pointIndex: null,
    type: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  });
  const [, setHoverState] = useState<HoverState>({
    measurementId: null,
    keypointId: null,
    pointIndex: null,
    elementType: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [adjustMode, setAdjustMode] = useState<
    'none' | 'zoom' | 'brightness' | 'contrast'
  >('none');
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [, setBrightness] = useState(0);
  const [, setContrast] = useState(0);
  const [, setImagePosition] = useState({ x: 0, y: 0 });

  const canvasDrag = useCanvasDrag({
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
  });

  const pointer = useCanvasPointerInteraction({
    imageNaturalSize: { width: 1000, height: 1000 },
    selectedTool: 'hand',
    isManualBindingMode: false,
    measurements,
    clickedPoints: [],
    hideAllAnnotations: false,
    hiddenAnnotationIds: new Set(),
    selectionState,
    setSelectionState,
    setHoverState,
    imageScale: 1,
    imagePosition: { x: 0, y: 0 },
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    adjustMode,
    setAdjustMode,
    dragStartPos,
    setDragStartPos,
    brightness: 0,
    setBrightness,
    contrast: 0,
    setContrast,
    isImagePanLocked: false,
    drawingState: { isDrawing: false },
    setLivePointerImagePoint: jest.fn(),
    imageToScreen: point => point,
    screenToImage: (x, y) => ({ x, y }),
    getTransformContext: () => ({
      imageNaturalSize: { width: 1000, height: 1000 },
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      containerSize: { width: 1000, height: 1000 },
    }),
    standardDistanceInteraction: {
      beginInteraction: () => false,
      updateInteraction: () => false,
      endInteraction: jest.fn(),
    },
    canvasDrag,
    drawingTool: {
      beginInteraction: () => false,
      updateInteraction: () => false,
      endInteraction: jest.fn(),
    },
    onManualBindingPointToggle: jest.fn(),
    onDisplayMeasurementSelect: jest.fn(),
    onCanvasClick: jest.fn(),
    setImagePosition,
  });

  useEffect(() => {
    onValue({ pointer, measurements, selectionState });
  }, [measurements, onValue, pointer, selectionState]);

  return null;
}

it('drags a TPA-owned effective CFH from its real FH midpoint', async () => {
  let latest: HarnessValue | null = null;
  render(
    <TpaEffectiveCfhPointerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => expect(latest).not.toBeNull());

  act(() => {
    latest!.pointer.beginPointerInteraction(pointerInput(150, 220));
  });
  await waitFor(() => {
    expect(latest!.selectionState).toMatchObject({
      measurementId: 'tpa-bilateral',
      type: 'effective-cfh',
      dragOffset: { x: 0, y: 0 },
    });
  });

  act(() => {
    latest!.pointer.updatePointerInteraction(pointerInput(160, 230));
  });
  await waitFor(() => {
    expect(latest!.measurements[0].points).toEqual([
      ...INITIAL_TPA_POINTS.slice(0, 4),
      { x: 110, y: 210 },
      { x: 130, y: 210 },
      { x: 210, y: 250 },
      { x: 230, y: 250 },
      { x: 120, y: 400 },
      { x: 240, y: 400 },
    ]);
  });
});
