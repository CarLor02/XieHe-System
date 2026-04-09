import { useState } from 'react';
import { Point } from '../../../types';
import { HoverState, SelectionState } from '../types';

/**
 * 画布选中与 hover 局部状态。
 */
export function useCanvasSelection() {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    measurementId: null,
    pointIndex: null,
    type: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  });
  const [hoverState, setHoverState] = useState<HoverState>({
    measurementId: null,
    pointIndex: null,
    elementType: null,
  });
  const [hiddenMeasurementIds, setHiddenMeasurementIds] = useState<Set<string>>(
    new Set()
  );
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState<Set<string>>(
    new Set()
  );
  const [selectionAnchor, setSelectionAnchor] = useState<Point | null>(null);

  return {
    selectionState,
    setSelectionState,
    hoverState,
    setHoverState,
    hiddenMeasurementIds,
    setHiddenMeasurementIds,
    hiddenAnnotationIds,
    setHiddenAnnotationIds,
    selectionAnchor,
    setSelectionAnchor,
  };
}

