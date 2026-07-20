'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Point,
  MeasurementData,
  ImageData,
  KeypointSequenceSession,
  Tool,
  VertebraAnnotation,
  CfhAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  AnnotationBindings,
  PointRef,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { getInheritedPoints } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-inheritance';
import {
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/transform/coordinate-transform';
import { TransformContext } from '@/app/imaging/features/image-viewer/shared/types';
import { useCanvasViewport } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasViewport';
import { useCanvasSelection } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasSelection';
import { useCanvasContextMenu } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasContextMenu';
import { useStandardDistanceInteraction } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useStandardDistanceInteraction';
import { useCanvasDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDrag';
import { useCanvasDrawingTool } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDrawingTool';
import { useCanvasPointer } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasPointer';
import {
  type VertebradDragSelection,
  useVertebradDrag,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useVertebradDrag';
import { useCanvasDrawing } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDrawing';
import { useCanvasOverlayState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasOverlayState';
import { useCanvasDerivedState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useCanvasDerivedState';
import ImageLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/ImageLayer';
import MeasurementLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/MeasurementLayer';
import PreviewLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/PreviewLayer';
import OverlayLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/OverlayLayer';
import SelectionOverlayLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/SelectionOverlayLayer';
import MeasurementResultsPanel from '@/app/imaging/features/image-viewer/features/annotation-canvas/panels/MeasurementResultsPanel';
import CanvasControlsPanel from '@/app/imaging/features/image-viewer/features/annotation-canvas/panels/CanvasControlsPanel';
import CanvasHintPanel from '@/app/imaging/features/image-viewer/features/annotation-canvas/panels/CanvasHintPanel';
import renderMeasurement from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/renderMeasurement';
import VertebraeLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/VertebraeLayer';
import {
  keypointIdToRenderCornerRef,
  keypointsToRenderLayer,
  KeypointAnnotation,
  renderCornerToKeypointId,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { isDirectlyEditableAnnotation } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-editability';
import { resolveMeasurementKeypointIds } from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-keypoint-selection';

export function getAnnotationCanvasCursorClass({
  keypointSequenceSession,
  showVertebraeLayer,
  isVertebradDragging,
  selectedTool,
  hasActiveOrHoveredCorner,
  fallbackCursorClass,
}: {
  keypointSequenceSession: KeypointSequenceSession | null;
  showVertebraeLayer: boolean;
  isVertebradDragging: boolean;
  selectedTool: string;
  hasActiveOrHoveredCorner: boolean;
  fallbackCursorClass: string;
}): string {
  if (keypointSequenceSession) return 'cursor-crosshair';

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

export default function AnnotationCanvas({
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
}: {
  selectedImage: Pick<ImageData, 'examType'>;
  measurements: MeasurementData[];
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  onMeasurementsUpdate: (measurements: MeasurementData[]) => void;
  onMeasurementUpdate?: (
    measurementId: string,
    updates: Partial<MeasurementData>
  ) => void;
  onMeasurementDelete?: (measurementId: string) => void;
  onClearAll: () => void;
  canUndoAnnotationHistory: boolean;
  onUndoAnnotationHistory: () => void;
  canRedoAnnotationHistory: boolean;
  onRedoAnnotationHistory: () => void;
  tools: Tool[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  imageId: string;
  isSettingStandardDistance: boolean;
  setIsSettingStandardDistance: (value: boolean) => void;
  standardDistancePoints: Point[];
  setStandardDistancePoints: (points: Point[]) => void;
  standardDistance: number | null;
  hoveredStandardPointIndex: number | null;
  setHoveredStandardPointIndex: (index: number | null) => void;
  draggingStandardPointIndex: number | null;
  setDraggingStandardPointIndex: (index: number | null) => void;
  recalculateAVTandTS: (distance?: number, points?: Point[]) => void;
  onImageSizeChange: (size: { width: number; height: number }) => void;
  onToolChange: (tool: string) => void;
  isImagePanLocked: boolean;
  pointBindings: AnnotationBindings;
  setPointBindings: (bindings: AnnotationBindings) => void;
  selectedBindingGroupId: string | null;
  centerOnPoint: Point | null;
  onCenterConsumed: () => void;
  onCanvasClick: () => void;
  isManualBindingMode: boolean;
  manualBindingSelectedPoints: PointRef[];
  onManualBindingPointToggle: (
    annotationId: string,
    pointIndex: number
  ) => void;
  vertebraeLayer?: VertebraAnnotation[];
  keypoints?: KeypointAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  showVertebraeLayer?: boolean;
  onVertebraeUpdate?: (updated: VertebraAnnotation[]) => void;
  onVertebraePreviewUpdate?: (updated: VertebraAnnotation[]) => void;
  onKeypointAdd?: (keypointId: string, point: Point) => void;
  keypointSequenceSession?: KeypointSequenceSession | null;
  onSequenceKeypointAdd?: (point: Point) => void;
  onKeypointDelete?: (keypointId: string) => void;
  onKeypointGroupDelete?: (vertebraLabel: string) => void;
  /** 测量点拖动后写回 vertebraeLayer（所有用户都可用） */
  onMeasurementWriteback?: (
    measurementType: string,
    pointIndex: number,
    newPoint: Point,
    measurementId?: string,
    updatedPoints?: Point[]
  ) => void;
  onCobbKeypointsSync?: (measurementId: string) => void;
  onAnnotationDataDragStart?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showVertebraeBoundingBox, setShowVertebraeBoundingBox] =
    useState(true);
  const {
    imagePosition,
    setImagePosition,
    imageScale,
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
    liveMouseImagePoint,
    setLiveMouseImagePoint,
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
  } = useCanvasDerivedState({
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
    containerSize: containerSize ?? undefined,
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

  const handleMouseEnter = () => {
    setIsHovering(true);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsDragging(false);
    // 鼠标离开时结束角点拖拽（避免拖着角点飞出画布）
    vertebradDrag.handleMouseUp();
    vertebradDrag.clearHover();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
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

  const pointer = useCanvasPointer({
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
    setLiveMouseImagePoint,
    imageToScreen,
    screenToImage,
    getTransformContext,
    standardDistanceInteraction,
    canvasDrag,
    drawingTool,
    onManualBindingPointToggle,
    onDisplayMeasurementSelect: selectMeasurementKeypoints,
    onCanvasClick,
    onContextMenu: handleContextMenu,
    setImagePosition,
  });

  return (
    <div
      ref={containerRef}
      data-image-canvas
      className={`relative w-full h-full overflow-hidden ${getAnnotationCanvasCursorClass(
        {
          keypointSequenceSession,
          showVertebraeLayer,
          isVertebradDragging: vertebradDrag.isDragging,
          selectedTool,
          hasActiveOrHoveredCorner: Boolean(
            effectiveHoveredCorner ?? vertebradDrag.activeCorner
          ),
          fallbackCursorClass: getCursorStyle(),
        }
      )} ${isHovering ? 'ring-2 ring-blue-400/50' : ''}`}
      onMouseDown={e => {
        if (keypointSequenceSession) {
          selectMeasurementKeypoints(null);
          setDetectionLayerSelection(null);
          const rect = containerRef.current?.getBoundingClientRect();
          const point = screenToImage(
            e.clientX - (rect?.left ?? 0),
            e.clientY - (rect?.top ?? 0)
          );
          onSequenceKeypointAdd?.(point);
          return;
        }

        if (selectedTool.startsWith('keypoint:')) {
          selectMeasurementKeypoints(null);
          setDetectionLayerSelection(null);
          const rect = containerRef.current?.getBoundingClientRect();
          const point = screenToImage(
            e.clientX - (rect?.left ?? 0),
            e.clientY - (rect?.top ?? 0)
          );
          onKeypointAdd?.(selectedTool.replace(/^keypoint:/, ''), point);
          setSelectedTool('hand');
          return;
        }
        // 先做椎体角点命中检测（不依赖 SVG 事件，使用屏幕坐标距离计算）
        // 命中角点时返回 true，跳过 pointer.onMouseDown 防止触发绘图/平移
        const handledKeypoint =
          selectedTool === 'hand' &&
          showVertebraeLayer &&
          vertebradDrag.handleMouseDown(e.clientX, e.clientY);
        if (handledKeypoint) {
          selectMeasurementKeypoints(null);
          return;
        }
        setDetectionLayerSelection(null);
        pointer.onMouseDown(e);
      }}
      onMouseMove={e => {
        // 椎体角点拖拽优先；同时做悬停检测（影响光标样式）
        const handledKeypoint =
          selectedTool === 'hand' &&
          (showVertebraeLayer || vertebradDrag.isDragging) &&
          vertebradDrag.handleMouseMove(e.clientX, e.clientY);
        // 角点拖拽中不转发给 pointer（避免误触绘图/图像平移逻辑）
        if (!handledKeypoint) pointer.onMouseMove(e);
      }}
      onMouseUp={() => {
        // 先结束角点拖拽（会触发 onVertebraeUpdate 回调），再交给 pointer
        if (showVertebraeLayer || vertebradDrag.isDragging) {
          vertebradDrag.handleMouseUp();
        }
        pointer.onMouseUp();
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onContextMenu={pointer.onContextMenu}
      onDragStart={e => e.preventDefault()}
      onDrag={e => e.preventDefault()}
      onDragEnd={e => e.preventDefault()}
    >
      <MeasurementResultsPanel
        examType={selectedImage.examType}
        showResults={showResults}
        hideAllLabels={hideAllLabels}
        hideAllAnnotations={hideAllAnnotations}
        isStandardDistanceHidden={isStandardDistanceHidden}
        standardDistance={standardDistance}
        standardDistancePoints={standardDistancePoints}
        measurements={measurements}
        keypoints={keypoints}
        selectionState={selectionState}
        hoverState={hoverState}
        hiddenMeasurementIds={hiddenMeasurementIds}
        hiddenAnnotationIds={hiddenAnnotationIds}
        hiddenKeypointIds={hiddenKeypointIds}
        onToggleResults={toggleResults}
        onToggleAllAnnotations={toggleAllAnnotations}
        onToggleAllLabels={toggleAllLabels}
        onToggleStandardDistanceVisibility={toggleStandardDistanceVisibility}
        onToggleMeasurementAnnotation={toggleMeasurementAnnotation}
        onToggleMeasurementLabel={toggleMeasurementLabel}
        onMeasurementHover={handlePanelMeasurementHover}
        onMeasurementSelect={handlePanelMeasurementSelect}
        onMeasurementDelete={handlePanelMeasurementDelete}
        onKeypointHover={handleKeypointHover}
        onToggleKeypointVisibility={handleToggleKeypointVisibility}
        onKeypointDelete={handleKeypointDelete}
        onMeasurementUpdate={handlePanelMeasurementUpdate}
        onCobbKeypointsSync={onCobbKeypointsSync}
      />

      <CanvasControlsPanel
        imageScale={imageScale}
        contrast={contrast}
        brightness={brightness}
        canUndoAnnotationHistory={canUndoAnnotationHistory}
        onUndoAnnotationHistory={onUndoAnnotationHistory}
        canRedoAnnotationHistory={canRedoAnnotationHistory}
        onRedoAnnotationHistory={onRedoAnnotationHistory}
        showVertebraeBoundingBox={showVertebraeBoundingBox}
        onToggleVertebraeBoundingBox={() =>
          setShowVertebraeBoundingBox(current => !current)
        }
        onClearAll={handleClear}
        onZoomOut={zoomOut}
        onZoomIn={zoomIn}
        onDecreaseContrast={decreaseContrast}
        onIncreaseContrast={increaseContrast}
        onDecreaseBrightness={decreaseBrightness}
        onIncreaseBrightness={increaseBrightness}
      />

      {/* 主图像 */}
      <div className="relative flex items-center justify-center w-full h-full">
        {imageLoading ? (
          <div className="flex items-center justify-center text-white">
            <i className="ri-loader-line w-8 h-8 flex items-center justify-center animate-spin mb-3 text-2xl"></i>
            <p className="text-sm ml-2">加载图像中...</p>
          </div>
        ) : imageUrl ? (
          <ImageLayer
            imageUrl={imageUrl}
            examType={selectedImage.examType}
            imagePosition={imagePosition}
            imageScale={imageScale}
            brightness={brightness}
            contrast={contrast}
            onDragStart={e => e.preventDefault()}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="flex items-center justify-center text-white">
            <p className="text-sm">图像加载失败</p>
          </div>
        )}
      </div>

      {/* SVG标注层 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 10,
        }}
      >
        {/* 定义箭头标记 */}
        <defs>
          {/* 正常状态箭头头 */}
          <marker
            id="arrowhead-normal"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
          </marker>

          {/* 悬浮状态箭头头 */}
          <marker
            id="arrowhead-hovered"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#fbbf24" />
          </marker>

          {/* 选中状态箭头头 */}
          <marker
            id="arrowhead-selected"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
          </marker>
        </defs>
        {/* 椎体标注层（AI检测结果，可隐藏）
            renderLayer：拖拽中为实时图层（角点跟手），否则为 vertebraeLayer prop
            交互完全在 div 层的 vertebradDrag 处理，VertebraeLayer 纯渲染 */}
        {showVertebraeLayer && visibleKeypointLayer.length > 0 && (
          <VertebraeLayer
            vertebraeLayer={vertebradDrag.renderLayer}
            cfhAnnotation={
              keypoints.some(keypoint => keypoint.id === 'CFH')
                ? null
                : cfhAnnotation
            }
            imageToScreen={imageToScreen}
            activeCorner={vertebradDrag.activeCorner}
            hoveredCorner={effectiveHoveredCorner}
            selectedKeypointIds={visibleSelectedKeypointIds}
            showVertebraeBoundingBox={showVertebraeBoundingBox}
          />
        )}

        <MeasurementLayer
          measurements={orderedVisibleMeasurements}
          renderMeasurement={renderVisibleMeasurement}
        />
        <PreviewLayer
          selectedTool={selectedTool}
          currentTool={currentTool ?? null}
          clickedPoints={clickedPoints}
          measurements={measurements}
          referenceLines={referenceLines}
          standardDistance={standardDistance}
          standardDistancePoints={standardDistancePoints}
          hoveredStandardPointIndex={hoveredStandardPointIndex}
          draggingStandardPointIndex={draggingStandardPointIndex}
          isStandardDistanceHidden={isStandardDistanceHidden}
          imageScale={imageScale}
          imageNaturalSize={imageNaturalSize}
          liveMouseImagePoint={liveMouseImagePoint}
          drawingState={drawingState}
          imageToScreen={imageToScreen}
          constrainAuxLinePoint={constrainAuxLinePoint}
          workingPointHoverIndex={workingPointHoverIndex}
          getInheritedPoints={getInheritedPoints}
        />
        <SelectionOverlayLayer
          selectionState={selectionState}
          measurements={measurements}
          clickedPoints={clickedPoints}
          imageToScreen={imageToScreen}
        />
      </svg>

      <CanvasHintPanel
        selectedTool={selectedTool}
        isImagePanLocked={isImagePanLocked}
        isHovering={isHovering}
        clickedPointsCount={clickedPoints.length}
        pointsNeeded={pointsNeeded}
        currentTool={currentTool}
        measurements={measurements}
        getInheritedPoints={getInheritedPoints}
        keypointSequenceSession={keypointSequenceSession}
      />

      <OverlayLayer
        editLabelDialog={editLabelDialog}
        setEditLabelDialog={setEditLabelDialog}
        onSaveLabel={handleSaveLabel}
        onCancelEdit={handleCancelEdit}
      />
    </div>
  );
}
