import { act, renderHook } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import { useState } from 'react';

import { useCanvasDrawingTool } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDrawingTool';
import type {
  DrawingState,
  ReferenceLines,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/types';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

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
      expect(result.current.drawingTool.handleMouseDown(x, y)).toBe(true);
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
