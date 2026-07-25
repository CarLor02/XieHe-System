import { useCallback, useState } from 'react';
import { Point } from '@/app/imaging/features/image-viewer/shared/types';
import {
  DrawingState,
  ReferenceLines,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';
import {
  constrainAuxiliaryLinePoint,
  retainReferenceLinesForTool,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/tools/tool-interaction-policy';

const EMPTY_REFERENCE_LINES: ReferenceLines = {
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
  const [referenceLines, setReferenceLines] = useState<ReferenceLines>(
    EMPTY_REFERENCE_LINES
  );

  const constrainAuxLinePoint = constrainAuxiliaryLinePoint;

  const clearReferenceLinesForTool = useCallback((toolId: string) => {
    setReferenceLines(previous =>
      retainReferenceLinesForTool(previous, toolId)
    );
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
