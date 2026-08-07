import { act, renderHook } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import { useState } from 'react';

import { useCanvasDrawingTool } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasDrawingTool';
import type {
  DrawingState,
  ReferenceLines,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';

const emptyReferenceLines: ReferenceLines = {
  t1Tilt: null,
  ca: null,
  po: null,
  css: null,
  avt: null,
  ts: null,
  lld: null,
  ss: null,
  sva: null,
  horizontalLine: null,
  verticalLine: null,
};

it('creates a twelve-point L/R measurement after four anatomical clicks', () => {
  const onMeasurementAdd = jest.fn();
  const onMeasurementComplete = jest.fn();

  const { result } = renderHook(() => {
    const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
    const [drawingState, setDrawingState] = useState<DrawingState>({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
    const [, setReferenceLines] = useState(emptyReferenceLines);

    return {
      clickedPoints,
      drawingTool: useCanvasDrawingTool({
        selectedTool: 'hemipelvic-width-ratio',
        tools: [
          {
            id: 'hemipelvic-width-ratio',
            name: 'L/R',
            icon: 'ri-ruler-2-line',
            description: '半骨盆宽度比(L/R)',
            pointsNeeded: 4,
          },
        ],
        measurements: [],
        keypoints: [],
        clickedPoints,
        setClickedPoints,
        imageScale: 1,
        onMeasurementAdd,
        onMeasurementComplete,
        drawingState,
        setDrawingState,
        setReferenceLines,
        constrainAuxLinePoint: (_toolId, _anchor, point) => point,
        screenToImage: (x, y) => ({ x, y }),
      }),
    };
  });

  for (const [x, y] of [
    [30, 10],
    [10, 20],
    [40, 30],
    [20, 40],
  ]) {
    act(() => {
      expect(result.current.drawingTool.beginInteraction(x, y)).toBe(true);
    });
  }

  expect(onMeasurementAdd).toHaveBeenCalledTimes(1);
  expect(onMeasurementAdd).toHaveBeenCalledWith(
    'hemipelvic-width-ratio',
    expect.arrayContaining([
      { x: 30, y: 10 },
      { x: 10, y: 20 },
      { x: 40, y: 30 },
      { x: 20, y: 40 },
    ])
  );
  expect(onMeasurementAdd.mock.calls[0][1]).toHaveLength(12);
  expect(onMeasurementComplete).toHaveBeenCalledTimes(1);
  expect(result.current.clickedPoints).toEqual([]);
});

it('completes a manual AVT disc line with two horizontal sorted anchors', () => {
  const onMeasurementAdd = jest.fn();
  const onAvtDiscPlacementComplete = jest.fn();

  const { result } = renderHook(() => {
    const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
    const [drawingState, setDrawingState] = useState<DrawingState>({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
    const [, setReferenceLines] = useState(emptyReferenceLines);

    return {
      clickedPoints,
      drawingTool: useCanvasDrawingTool({
        selectedTool: 'avt',
        tools: [
          {
            id: 'avt',
            name: 'AVT',
            icon: 'ri-focus-2-line',
            description: '顶椎平移量',
            pointsNeeded: 6,
          },
        ],
        measurements: [],
        keypoints: [],
        clickedPoints,
        setClickedPoints,
        imageScale: 1,
        onMeasurementAdd,
        avtPlacementSession: {
          target: {
            type: 'disc',
            upperVertebra: 'T11',
            lowerVertebra: 'T12',
          },
          step: {
            kind: 'disc',
            label: 'T11-T12',
          },
        },
        onAvtDiscPlacementComplete,
        drawingState,
        setDrawingState,
        setReferenceLines,
        constrainAuxLinePoint: (_toolId, _anchor, point) => point,
        screenToImage: (x, y) => ({ x, y }),
      }),
    };
  });

  act(() => {
    expect(result.current.drawingTool.beginInteraction(80, 20)).toBe(true);
  });
  expect(result.current.clickedPoints).toEqual([{ x: 80, y: 20 }]);

  act(() => {
    expect(result.current.drawingTool.beginInteraction(20, 90)).toBe(true);
  });
  expect(onAvtDiscPlacementComplete).toHaveBeenCalledWith([
    { x: 20, y: 20 },
    { x: 80, y: 20 },
  ]);
  expect(onMeasurementAdd).not.toHaveBeenCalled();
  expect(result.current.clickedPoints).toEqual([]);
});

it('only asks for the missing PI keypoint and assembles inherited points by slot', () => {
  const onMeasurementAdd = jest.fn();

  const { result } = renderHook(() => {
    const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
    const [drawingState, setDrawingState] = useState<DrawingState>({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
    const [, setReferenceLines] = useState(emptyReferenceLines);

    return useCanvasDrawingTool({
      selectedTool: 'pi',
      tools: [
        {
          id: 'pi',
          name: 'PI',
          icon: 'test',
          description: 'test',
          pointsNeeded: 3,
        },
      ],
      measurements: [],
      keypoints: [
        {
          id: 'CFH',
          point: { x: 50, y: 60 },
          source: AnnotationSource.MANUAL,
          confidence: 1,
        },
        {
          id: 'S1-1',
          point: { x: 100, y: 200 },
          source: AnnotationSource.MANUAL,
          confidence: 1,
        },
      ],
      clickedPoints,
      setClickedPoints,
      imageScale: 1,
      onMeasurementAdd,
      drawingState,
      setDrawingState,
      setReferenceLines,
      constrainAuxLinePoint: (_toolId, _anchor, point) => point,
      screenToImage: (x, y) => ({ x, y }),
    });
  });

  act(() => {
    expect(result.current.beginInteraction(220, 210)).toBe(true);
  });

  expect(onMeasurementAdd).toHaveBeenCalledWith('pi', [
    { x: 50, y: 60 },
    { x: 100, y: 200 },
    { x: 220, y: 210 },
  ]);
});

it('places bilateral PI in the stable six-point order while inheriting S1', () => {
  const onMeasurementAdd = jest.fn();

  const { result } = renderHook(() => {
    const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
    const [drawingState, setDrawingState] = useState<DrawingState>({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
    const [, setReferenceLines] = useState(emptyReferenceLines);

    return useCanvasDrawingTool({
      selectedTool: 'pi',
      tools: [
        {
          id: 'pi',
          name: 'PI',
          icon: 'test',
          description: 'test',
          pointsNeeded: 3,
        },
      ],
      measurements: [],
      keypoints: [
        {
          id: 'S1-1',
          point: { x: 100, y: 200 },
          source: AnnotationSource.MANUAL,
          confidence: 1,
        },
        {
          id: 'S1-2',
          point: { x: 200, y: 200 },
          source: AnnotationSource.MANUAL,
          confidence: 1,
        },
      ],
      clickedPoints,
      setClickedPoints,
      imageScale: 1,
      onMeasurementAdd,
      pelvicPlacementSession: { toolId: 'pi', mode: 'bilateral' },
      drawingState,
      setDrawingState,
      setReferenceLines,
      constrainAuxLinePoint: (_toolId, _anchor, point) => point,
      screenToImage: (x, y) => ({ x, y }),
    });
  });

  for (const point of [
    [20, 30],
    [30, 30],
    [60, 30],
    [75, 30],
  ] as const) {
    act(() => {
      result.current.beginInteraction(point[0], point[1]);
    });
  }

  expect(onMeasurementAdd).toHaveBeenCalledWith('pi', [
    { x: 20, y: 30 },
    { x: 30, y: 30 },
    { x: 60, y: 30 },
    { x: 75, y: 30 },
    { x: 100, y: 200 },
    { x: 200, y: 200 },
  ]);
});
