import { useCallback, useState } from 'react';
import { Point } from '../../../types';
import { DrawingState, ReferenceLines } from '../types';

const EMPTY_REFERENCE_LINES: ReferenceLines = {
  t1Tilt: null,
  ca: null,
  pelvic: null,
  sacral: null,
  avt: null,
  ts: null,
  lld: null,
  ss: null,
  sva: null,
  horizontalLine: null,
  verticalLine: null,
};

/**
 * 绘制预览局部状态。
 * 统一承接 drawingState、动态鼠标点和参考线，避免入口组件继续直接持有这类临时状态。
 */
export function useCanvasDrawing() {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
  });
  const [liveMouseImagePoint, setLiveMouseImagePoint] = useState<Point | null>(
    null
  );
  const [referenceLines, setReferenceLines] =
    useState<ReferenceLines>(EMPTY_REFERENCE_LINES);

  const constrainAuxLinePoint = useCallback(
    (toolId: string, anchor: Point, rawPoint: Point): Point => {
      if (toolId === 'aux-horizontal-line') {
        return { x: rawPoint.x, y: anchor.y };
      }
      if (toolId === 'aux-vertical-line') {
        return { x: anchor.x, y: rawPoint.y };
      }
      return rawPoint;
    },
    []
  );

  const clearReferenceLinesForTool = useCallback((toolId: string) => {
    setReferenceLines(previous => ({
      ...previous,
      t1Tilt:
        toolId.includes('t1-tilt') || toolId.includes('t1-slope')
          ? previous.t1Tilt
          : null,
      ca: toolId.includes('ca') ? previous.ca : null,
      pelvic: toolId.includes('pelvic') ? previous.pelvic : null,
      sacral: toolId.includes('sacral') ? previous.sacral : null,
      avt: toolId.includes('avt') ? previous.avt : null,
      ts: toolId.includes('ts') ? previous.ts : null,
      lld: toolId.includes('lld') ? previous.lld : null,
      ss: toolId.includes('ss') ? previous.ss : null,
      sva: toolId.includes('sva') ? previous.sva : null,
      horizontalLine:
        toolId === 'aux-horizontal-line' ? previous.horizontalLine : null,
      verticalLine:
        toolId === 'aux-vertical-line' ? previous.verticalLine : null,
    }));
  }, []);

  return {
    drawingState,
    setDrawingState,
    liveMouseImagePoint,
    setLiveMouseImagePoint,
    referenceLines,
    setReferenceLines,
    constrainAuxLinePoint,
    clearReferenceLinesForTool,
  };
}

