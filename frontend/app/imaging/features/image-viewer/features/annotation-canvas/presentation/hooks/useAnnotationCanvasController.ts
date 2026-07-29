'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Point,
  MeasurementData,
  KeypointSequenceSession,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/transform/coordinate-transform';
import type { TransformContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/viewport-transform';
import { useCanvasViewport } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/hooks/useCanvasViewport';
import { useCanvasSelection } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasSelection';
import { useCanvasContextMenu } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/hooks/useCanvasContextMenu';
import { useStandardDistanceInteraction } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useStandardDistanceInteraction';
import { useCanvasDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasDrag';
import { useCanvasDrawingTool } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasDrawingTool';
import { useCanvasPointerInteraction } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasPointerInteraction';
import { useCanvasPointerEvents } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/hooks/useCanvasPointerEvents';
import {
  type VertebradDragSelection,
  useVertebradDrag,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useVertebradDrag';
import { useCanvasDrawing } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasDrawing';
import { useCanvasOverlayState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hooks/useCanvasOverlayState';
import { buildCanvasDerivedState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/selectors/buildCanvasDerivedState';
import renderMeasurement from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/renderMeasurement';
import {
  keypointIdToRenderCornerRef,
  keypointsToRenderLayer,
  renderCornerToKeypointId,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import { isDirectlyEditableAnnotation } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-editability';
import { resolveMeasurementKeypointIds } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync';
import type { AnnotationCanvasProps } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/annotation-canvas-props';
import type { CanvasPointerInput } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/input/pointer-input';

export function getAnnotationCanvasCursorClass({
  keypointSequenceSession,
  avtPlacementSession = null,
  showVertebraeLayer,
  isVertebradDragging,
  selectedTool,
  hasActiveOrHoveredCorner,
  fallbackCursorClass,
}: {
  keypointSequenceSession: KeypointSequenceSession | null;
  avtPlacementSession?: AnnotationCanvasProps['avtPlacementSession'];
  showVertebraeLayer: boolean;
  isVertebradDragging: boolean;
  selectedTool: string;
  hasActiveOrHoveredCorner: boolean;
  fallbackCursorClass: string;
}): string {
  if (keypointSequenceSession || avtPlacementSession) return 'cursor-crosshair';

  if (
    (showVertebraeLayer || isVertebradDragging) &&
    selectedTool === 'hand' &&
    hasActiveOrHoveredCorner
  ) {
    return 'cursor-crosshair';
  }

  return fallbackCursorClass;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function isDeleteShortcut(event: KeyboardEvent): boolean {
  return event.key === 'Delete';
}

export function getDetectionSelectionKeypointIds(
  selection: VertebradDragSelection | null,
  visibleKeypointLayer: VertebraAnnotation[]
): string[] {
  if (!selection) return [];
  if (selection.kind === 'keypoint') {
    return keypointIdToRenderCornerRef(
      selection.keypointId,
      visibleKeypointLayer
    )
      ? [selection.keypointId]
      : [];
  }

  const vertebra = visibleKeypointLayer.find(
    item => item.label === selection.vertebraLabel
  );
  if (!vertebra) return [];

  return Array.from(
    new Set(
      vertebra.corners.map((_, index) =>
        renderCornerToKeypointId(vertebra.label, index)
      )
    )
  );
}

export function useAnnotationCanvasController({
  selectedImage,
  measurements,
  selectedTool,
  setSelectedTool,
  onMeasurementAdd,
  onMeasurementsUpdate,
  onMeasurementUpdate,
  onMeasurementDelete,
  onClearAll,
  canUndoAnnotationHistory,
  onUndoAnnotationHistory,
  canRedoAnnotationHistory,
  onRedoAnnotationHistory,
  tools,
  clickedPoints,
  setClickedPoints,
  avtPlacementSession = null,
  onAvtKeypointPlacement,
  onAvtDiscPlacementComplete,
  imageId,
  isSettingStandardDistance,
  setIsSettingStandardDistance,
  standardDistancePoints,
  setStandardDistancePoints,
  standardDistance,
  hoveredStandardPointIndex,
  setHoveredStandardPointIndex,
  draggingStandardPointIndex,
  setDraggingStandardPointIndex,
  recalculateAVTandTS,
  onImageSizeChange,
  onToolChange,
  isImagePanLocked,
  pointBindings,
  setPointBindings,
  selectedBindingGroupId,
  centerOnPoint,
  onCenterConsumed,
  onCanvasClick,
  isManualBindingMode,
  manualBindingSelectedPoints,
  onManualBindingPointToggle,
  vertebraeLayer = [],
  keypoints = [],
  cfhAnnotation = null,
  showVertebraeLayer = false,
  onVertebraeUpdate,
  onVertebraePreviewUpdate,
  onKeypointAdd,
  keypointSequenceSession = null,
  onSequenceKeypointAdd,
  onKeypointDelete,
  onKeypointGroupDelete,
  onMeasurementWriteback,
  onCobbKeypointsSync,
  onAnnotationDataDragStart,
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showVertebraeBoundingBox, setShowVertebraeBoundingBox] =
    useState(true);
  const {
    imagePosition,
    setImagePosition,
    imageScale,
    setImageScale,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    isHovering,
    setIsHovering,
    adjustMode,
    setAdjustMode,
    dragStartPos,
    setDragStartPos,
    imageUrl,
    imageLoading,
    imageNaturalSize,
    containerSize,
    handleImageLoad,
    handleWheel,
    handleDoubleClick,
    getCursorStyle,
    zoomIn,
    zoomOut,
    increaseContrast,
    decreaseContrast,
    increaseBrightness,
    decreaseBrightness,
  } = useCanvasViewport({
    imageId,
    centerOnPoint,
    containerRef,
    selectedTool,
    isSettingStandardDistance,
    onCenterConsumed,
    onImageSizeChange,
    onResetView: () => setClickedPoints([]),
  });

  const {
    selectionState,
    setSelectionState,
    hoverState,
    setHoverState,
    hiddenMeasurementIds,
    setHiddenMeasurementIds,
    hiddenAnnotationIds,
    setHiddenAnnotationIds,
  } = useCanvasSelection();
  const [hiddenKeypointIds, setHiddenKeypointIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedKeypointIds, setSelectedKeypointIds] = useState<Set<string>>(
    new Set()
  );
  const [detectionLayerSelection, setDetectionLayerSelection] =
    useState<VertebradDragSelection | null>(null);
  const {
    drawingState,
    setDrawingState,
    livePointerImagePoint,
    setLivePointerImagePoint,
    referenceLines,
    setReferenceLines,
    constrainAuxLinePoint,
    clearReferenceLinesForTool,
  } = useCanvasDrawing();
  const {
    showResults,
    hideAllLabels,
    hideAllAnnotations,
    isStandardDistanceHidden,
    toggleResults,
    toggleAllAnnotations,
    toggleAllLabels,
    toggleMeasurementAnnotation,
    toggleMeasurementLabel,
    toggleStandardDistanceVisibility,
    removeMeasurementVisibility,
  } = useCanvasOverlayState({
    measurements,
    hiddenMeasurementIds,
    setHiddenMeasurementIds,
    hiddenAnnotationIds,
    setHiddenAnnotationIds,
  });

  const {
    editLabelDialog,
    setEditLabelDialog,
    handleContextMenu,
    handleSaveLabel,
    handleCancelEdit,
  } = useCanvasContextMenu({
    imageNaturalSize,
    selectionState,
    measurements,
    selectedTool,
    onToolChange,
    setSelectionState,
    onMeasurementsUpdate,
    pointBindings,
    setPointBindings,
  });

  const {
    currentTool,
    pointsNeeded,
    orderedVisibleMeasurements,
    workingPointHoverIndex,
  } = buildCanvasDerivedState({
    selectedTool,
    tools,
    measurements,
    hideAllAnnotations,
    hiddenAnnotationIds,
    hoverState,
  });

  // 监听工具切换，清理参考线状态（优化：使用referenceLines）
  useEffect(() => {
    clearReferenceLinesForTool(selectedTool);
    // 工具切换时清空当前点击的点
    setClickedPoints([]);
  }, [clearReferenceLinesForTool, selectedTool, setClickedPoints]);

  // 清空所有标注
  const handleClear = () => {
    // 清空父组件的测量数据（包括所有测量和辅助图形）
    onClearAll();

    // 清空当前正在绘制的点
    setClickedPoints([]);
  };

  const handlePanelMeasurementHover = (measurementId: string | null) => {
    setHoverState({
      measurementId,
      keypointId: null,
      elementType: measurementId ? 'whole' : null,
      pointIndex: null,
    });
  };

  const handleKeypointHover = useCallback(
    (keypointId: string | null) => {
      setHoverState({
        measurementId: null,
        keypointId,
        elementType: keypointId ? 'keypoint' : null,
        pointIndex: null,
      });
    },
    [setHoverState]
  );

  const selectMeasurementKeypoints = useCallback(
    (measurementId: string | null) => {
      if (!measurementId) {
        setSelectedKeypointIds(new Set());
        return;
      }

      setDetectionLayerSelection(null);
      const measurement = measurements.find(item => item.id === measurementId);
      const keypointIds = measurement
        ? resolveMeasurementKeypointIds(measurement, keypoints)
        : [];
      setSelectedKeypointIds(new Set(keypointIds));
    },
    [keypoints, measurements]
  );

  const handlePanelMeasurementSelect = (measurementId: string) => {
    setSelectedTool('hand');
    const measurement = measurements.find(item => item.id === measurementId);
    const isDirectlyEditable = measurement
      ? isDirectlyEditableAnnotation(measurement.type)
      : false;

    if (selectionState.measurementId === measurementId) {
      selectMeasurementKeypoints(null);
      setSelectionState({
        measurementId: null,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      });
      return;
    }

    if (!isDirectlyEditable) {
      selectMeasurementKeypoints(measurementId);
      setSelectionState({
        measurementId,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      });
      return;
    }

    selectMeasurementKeypoints(null);
    setSelectionState({
      measurementId,
      pointIndex: null,
      type: 'whole',
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });
  };

  const handlePanelMeasurementDelete = (measurementId: string) => {
    if (onMeasurementDelete) {
      onMeasurementDelete(measurementId);
    } else {
      onMeasurementsUpdate(
        measurements.filter(item => item.id !== measurementId)
      );
    }
    if (selectionState.measurementId === measurementId) {
      selectMeasurementKeypoints(null);
      setSelectionState({
        measurementId: null,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      });
    }
    removeMeasurementVisibility(measurementId);
  };

  const handlePanelMeasurementUpdate = (
    measurementId: string,
    updates: Partial<MeasurementData>
  ) => {
    if (onMeasurementUpdate) {
      onMeasurementUpdate(measurementId, updates);
      return;
    }

    onMeasurementsUpdate(
      measurements.map(item =>
        item.id === measurementId ? { ...item, ...updates } : item
      )
    );
  };

  // 创建坐标转换上下文
  const getTransformContext = (): TransformContext => ({
    imageNaturalSize,
    imagePosition,
    imageScale,
    containerSize,
  });

  // 坐标转换函数：将图像坐标系转换为屏幕坐标系
  // 使用工具函数库中的实现
  const imageToScreen = (point: Point): Point => {
    return utilImageToScreen(point, getTransformContext());
  };

  // 坐标转换函数：将屏幕坐标系转换为图像坐标系
  // 使用工具函数库中的实现
  const screenToImage = (screenX: number, screenY: number): Point => {
    return utilScreenToImage(screenX, screenY, getTransformContext());
  };

  // 计算函数已移至annotationConfig.ts中

  const standardDistanceInteraction = useStandardDistanceInteraction({
    isSettingStandardDistance,
    selectedTool,
    standardDistancePoints,
    setStandardDistancePoints,
    setIsSettingStandardDistance,
    draggingStandardPointIndex,
    setDraggingStandardPointIndex,
    hoveredStandardPointIndex,
    setHoveredStandardPointIndex,
    standardDistance,
    recalculateAVTandTS,
    imageToScreen,
    screenToImage,
    onAnnotationDragStart: onAnnotationDataDragStart,
  });

  const visibleKeypointLayer =
    keypoints.length > 0
      ? keypointsToRenderLayer(
          keypoints,
          selectedImage.examType,
          hiddenKeypointIds
        )
      : vertebraeLayer;
  const rawDetectionSelectedKeypointIds = useMemo(
    () =>
      getDetectionSelectionKeypointIds(
        detectionLayerSelection,
        visibleKeypointLayer
      ),
    [detectionLayerSelection, visibleKeypointLayer]
  );
  const effectiveDetectionLayerSelection =
    selectedTool === 'hand' &&
    showVertebraeLayer &&
    rawDetectionSelectedKeypointIds.length > 0
      ? detectionLayerSelection
      : null;
  const detectionSelectedKeypointIds = useMemo(
    () =>
      effectiveDetectionLayerSelection ? rawDetectionSelectedKeypointIds : [],
    [effectiveDetectionLayerSelection, rawDetectionSelectedKeypointIds]
  );
  const visibleSelectedKeypointIds = useMemo(() => {
    if (detectionSelectedKeypointIds.length === 0) return selectedKeypointIds;
    const next = new Set(selectedKeypointIds);
    detectionSelectedKeypointIds.forEach(keypointId => {
      next.add(keypointId);
    });
    return next;
  }, [detectionSelectedKeypointIds, selectedKeypointIds]);

  const keypointIdToCornerRef = (keypointId: string | null) => {
    return keypointIdToRenderCornerRef(keypointId, visibleKeypointLayer);
  };

  // 椎体角点拖拽 hook：命中检测和拖拽完全在 div 层处理，不依赖 SVG 事件
  const vertebradDrag = useVertebradDrag({
    vertebraeLayer: visibleKeypointLayer,
    imageToScreen,
    screenToImage,
    onVertebraeUpdate,
    onLiveLayerChange: onVertebraePreviewUpdate,
    containerRef,
    onHoverChange: handleKeypointHover,
    onSelectionChange: setDetectionLayerSelection,
    onAnnotationDragStart: onAnnotationDataDragStart,
    enableFrameHitTest: showVertebraeBoundingBox,
  });
  const { clearHover } = vertebradDrag;
  const hoveredKeypointCorner = keypointIdToCornerRef(hoverState.keypointId);
  const effectiveHoveredCorner =
    vertebradDrag.hoveredCorner ?? hoveredKeypointCorner;

  useEffect(() => {
    if (selectedTool !== 'hand') {
      clearHover();
    }
  }, [selectedTool, clearHover]);

  useEffect(() => {
    if (selectedTool === 'hand' && showVertebraeLayer) return;

    const timeoutId = window.setTimeout(() => {
      setDetectionLayerSelection(null);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedTool, showVertebraeLayer]);

  const canvasDrag = useCanvasDrag({
    selectedTool,
    selectionState,
    setSelectionState,
    measurements,
    clickedPoints,
    setClickedPoints,
    pointBindings,
    standardDistance,
    standardDistancePoints,
    imageNaturalSize,
    imageScale,
    onMeasurementsUpdate,
    // 存在关键点时默认禁止测量项整体拖拽，防止测量层与关键点层分离。
    // 检测层隐藏时关键点仍然存在，因此不能使用 showVertebraeLayer 判断。
    // 手动 TTS 躯干线只移动未绑定的 points[0..1]，由拖动规则提供明确例外。
    disableWholeDrag: keypoints.length > 0,
    onMeasurementWriteback,
    imageToScreen,
    screenToImage,
    referenceLines,
    setReferenceLines,
    onAnnotationDragStart: onAnnotationDataDragStart,
  });
  const drawingTool = useCanvasDrawingTool({
    selectedTool,
    tools,
    measurements,
    clickedPoints,
    setClickedPoints,
    imageScale,
    onMeasurementAdd,
    onMeasurementComplete: () => setSelectedTool('hand'),
    avtPlacementSession,
    onAvtDiscPlacementComplete,
    drawingState,
    setDrawingState,
    setReferenceLines,
    constrainAuxLinePoint,
    screenToImage,
  });
  const renderVisibleMeasurement = (
    measurement: MeasurementData,
    index: number,
    allMeasurements: MeasurementData[]
  ) =>
    renderMeasurement({
      measurement,
      imageScale,
      imagePosition,
      imageNaturalSize,
      standardDistance,
      standardDistancePoints,
      containerSize: containerSize ?? undefined,
      selectionState,
      hoverState,
      hideAllLabels,
      hiddenMeasurementIds,
      pointBindings,
      selectedBindingGroupId,
      isManualBindingMode,
      manualBindingSelectedPoints,
      allMeasurements,
      measurementIndex: index,
    });

  const handlePointerHoverEnter = () => {
    setIsHovering(true);
  };

  const handlePointerHoverLeave = () => {
    setIsHovering(false);
    vertebradDrag.clearHover();
    pointerInteraction.clearHover();
  };

  const handleToggleKeypointVisibility = (keypointId: string) => {
    setHiddenKeypointIds(previous => {
      const next = new Set(previous);
      if (next.has(keypointId)) {
        next.delete(keypointId);
      } else {
        next.add(keypointId);
      }
      return next;
    });
  };

  const handleKeypointDelete = useCallback(
    (keypointId: string) => {
      setHiddenKeypointIds(previous => {
        const next = new Set(previous);
        next.delete(keypointId);
        return next;
      });
      setDetectionLayerSelection(previous =>
        previous?.kind === 'keypoint' && previous.keypointId === keypointId
          ? null
          : previous
      );
      onKeypointDelete?.(keypointId);
    },
    [onKeypointDelete]
  );

  const handleDetectionLayerDelete = useCallback(() => {
    if (!effectiveDetectionLayerSelection) return false;

    if (effectiveDetectionLayerSelection.kind === 'keypoint') {
      handleKeypointDelete(effectiveDetectionLayerSelection.keypointId);
    } else {
      onKeypointGroupDelete?.(effectiveDetectionLayerSelection.vertebraLabel);
    }

    setDetectionLayerSelection(null);
    return true;
  }, [
    effectiveDetectionLayerSelection,
    handleKeypointDelete,
    onKeypointGroupDelete,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return;
      if (!isDeleteShortcut(event)) return;
      if (!handleDetectionLayerDelete()) return;

      event.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDetectionLayerDelete]);

  const pointerInteraction = useCanvasPointerInteraction({
    imageNaturalSize,
    selectedTool,
    isManualBindingMode,
    measurements,
    clickedPoints,
    hideAllAnnotations,
    hiddenAnnotationIds,
    selectionState,
    setSelectionState,
    setHoverState,
    imageScale,
    imagePosition,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    adjustMode,
    setAdjustMode,
    dragStartPos,
    setDragStartPos,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    isImagePanLocked,
    drawingState,
    setLivePointerImagePoint,
    imageToScreen,
    screenToImage,
    getTransformContext,
    standardDistanceInteraction,
    canvasDrag,
    drawingTool,
    onManualBindingPointToggle,
    onDisplayMeasurementSelect: selectMeasurementKeypoints,
    onCanvasClick,
    setImagePosition,
  });

  const handleCanvasPointerDown = (input: CanvasPointerInput) => {
    if (avtPlacementSession?.step.kind === 'keypoint') {
      selectMeasurementKeypoints(null);
      setDetectionLayerSelection(null);
      const point = screenToImage(input.screenPoint.x, input.screenPoint.y);
      onAvtKeypointPlacement?.(point);
      return;
    }

    if (keypointSequenceSession) {
      selectMeasurementKeypoints(null);
      setDetectionLayerSelection(null);
      const point = screenToImage(input.screenPoint.x, input.screenPoint.y);
      onSequenceKeypointAdd?.(point);
      return;
    }

    if (selectedTool.startsWith('keypoint:')) {
      selectMeasurementKeypoints(null);
      setDetectionLayerSelection(null);
      const point = screenToImage(input.screenPoint.x, input.screenPoint.y);
      onKeypointAdd?.(selectedTool.replace(/^keypoint:/, ''), point);
      setSelectedTool('hand');
      return;
    }

    const handledKeypoint =
      selectedTool === 'hand' &&
      showVertebraeLayer &&
      vertebradDrag.beginInteraction(
        input.clientPoint.x,
        input.clientPoint.y,
        input.policy.pointHitRadius,
        input.policy.dragStartThreshold
      );
    if (handledKeypoint) {
      selectMeasurementKeypoints(null);
      return;
    }

    setDetectionLayerSelection(null);
    pointerInteraction.beginPointerInteraction(input);
  };

  const handleCanvasPointerMove = (input: CanvasPointerInput) => {
    const handledKeypoint =
      selectedTool === 'hand' &&
      (showVertebraeLayer || vertebradDrag.isDragging) &&
      vertebradDrag.updateInteraction(
        input.clientPoint.x,
        input.clientPoint.y,
        input.policy.supportsHover,
        input.policy.pointHitRadius
      );
    if (!handledKeypoint) {
      pointerInteraction.updatePointerInteraction(input);
    }
  };

  const handleCanvasPointerEnd = () => {
    if (showVertebraeLayer || vertebradDrag.isDragging) {
      vertebradDrag.endInteraction();
    }
    pointerInteraction.endPointerInteraction();
  };

  const pointerEvents = useCanvasPointerEvents({
    imageScale,
    imagePosition,
    canStartPinch: () =>
      selectedTool === 'hand' &&
      !vertebradDrag.hasStartedInteraction() &&
      !selectionState.isDragging &&
      draggingStandardPointIndex === null &&
      !drawingState.isDrawing,
    onPinchStart: () => {
      vertebradDrag.cancelPendingInteraction();
      pointerInteraction.endPointerInteraction();
      setLivePointerImagePoint(null);
    },
    onPinchViewportChange: viewport => {
      setImageScale(viewport.imageScale);
      setImagePosition(viewport.imagePosition);
    },
    onPointerDown: handleCanvasPointerDown,
    onPointerMove: handleCanvasPointerMove,
    onPointerEnd: handleCanvasPointerEnd,
    onHoverEnter: handlePointerHoverEnter,
    onHoverLeave: handlePointerHoverLeave,
  });

  return {
    container: {
      className: 'relative w-full h-full overflow-hidden',
    },
    interactionSurface: {
      ref: containerRef,
      className: `absolute inset-0 z-0 overflow-hidden ${getAnnotationCanvasCursorClass(
        {
          keypointSequenceSession,
          avtPlacementSession,
          showVertebraeLayer,
          isVertebradDragging: vertebradDrag.isDragging,
          selectedTool,
          hasActiveOrHoveredCorner: Boolean(
            effectiveHoveredCorner ?? vertebradDrag.activeCorner
          ),
          fallbackCursorClass: getCursorStyle(),
        }
      )} ${isHovering ? 'ring-2 ring-blue-400/50' : ''}`,
      style: { touchAction: 'none' },
      ...pointerEvents,
      onWheel: handleWheel,
      onDoubleClick: handleDoubleClick,
      onContextMenu: handleContextMenu,
    },
    resultsPanel: {
      examType: selectedImage.examType,
      showResults,
      hideAllLabels,
      hideAllAnnotations,
      isStandardDistanceHidden,
      standardDistance,
      standardDistancePoints,
      measurements,
      keypoints,
      selectionState,
      hoverState,
      hiddenMeasurementIds,
      hiddenAnnotationIds,
      hiddenKeypointIds,
      onToggleResults: toggleResults,
      onToggleAllAnnotations: toggleAllAnnotations,
      onToggleAllLabels: toggleAllLabels,
      onToggleStandardDistanceVisibility: toggleStandardDistanceVisibility,
      onToggleMeasurementAnnotation: toggleMeasurementAnnotation,
      onToggleMeasurementLabel: toggleMeasurementLabel,
      onMeasurementHover: handlePanelMeasurementHover,
      onMeasurementSelect: handlePanelMeasurementSelect,
      onMeasurementDelete: handlePanelMeasurementDelete,
      onKeypointHover: handleKeypointHover,
      onToggleKeypointVisibility: handleToggleKeypointVisibility,
      onKeypointDelete: handleKeypointDelete,
      onMeasurementUpdate: handlePanelMeasurementUpdate,
      onCobbKeypointsSync,
    },
    controlsPanel: {
      imageScale,
      contrast,
      brightness,
      canUndoAnnotationHistory,
      onUndoAnnotationHistory,
      canRedoAnnotationHistory,
      onRedoAnnotationHistory,
      showVertebraeBoundingBox,
      onToggleVertebraeBoundingBox: () =>
        setShowVertebraeBoundingBox(current => !current),
      onClearAll: handleClear,
      onZoomOut: zoomOut,
      onZoomIn: zoomIn,
      onDecreaseContrast: decreaseContrast,
      onIncreaseContrast: increaseContrast,
      onDecreaseBrightness: decreaseBrightness,
      onIncreaseBrightness: increaseBrightness,
    },
    image: {
      imageLoading,
      imageUrl,
      examType: selectedImage.examType,
      imagePosition,
      imageScale,
      brightness,
      contrast,
      onLoad: handleImageLoad,
    },
    vertebrae: {
      visible: showVertebraeLayer && visibleKeypointLayer.length > 0,
      vertebraeLayer: vertebradDrag.renderLayer,
      cfhAnnotation: keypoints.some(keypoint => keypoint.id === 'CFH')
        ? null
        : cfhAnnotation,
      imageToScreen,
      activeCorner: vertebradDrag.activeCorner,
      hoveredCorner: effectiveHoveredCorner,
      selectedKeypointIds: visibleSelectedKeypointIds,
      showVertebraeBoundingBox,
    },
    measurementLayer: {
      measurements: orderedVisibleMeasurements,
      renderMeasurement: renderVisibleMeasurement,
    },
    previewLayer: {
      selectedTool,
      currentTool: currentTool ?? null,
      clickedPoints,
      measurements,
      referenceLines,
      standardDistance,
      standardDistancePoints,
      hoveredStandardPointIndex,
      draggingStandardPointIndex,
      isStandardDistanceHidden,
      imageScale,
      imageNaturalSize,
      livePointerImagePoint,
      drawingState,
      imageToScreen,
      constrainAuxLinePoint,
      workingPointHoverIndex,
    },
    selectionLayer: {
      selectionState,
      measurements,
      clickedPoints,
      imageToScreen,
    },
    hintPanel: {
      selectedTool,
      isImagePanLocked,
      isHovering,
      clickedPointsCount: clickedPoints.length,
      pointsNeeded,
      currentTool,
      measurements,
      keypointSequenceSession,
      avtPlacementSession,
    },
    overlayLayer: {
      editLabelDialog,
      setEditLabelDialog,
      onSaveLabel: handleSaveLabel,
      onCancelEdit: handleCancelEdit,
    },
  };
}

export type AnnotationCanvasController = ReturnType<
  typeof useAnnotationCanvasController
>;
