'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Point,
  MeasurementData,
  ImageData,
  Tool,
  VertebraAnnotation,
  CfhAnnotation,
} from '../types';
import { AnnotationBindings, PointRef } from '../domain/annotation-binding';
import { CalculationContext } from '../catalog/shared/annotation-config';
import { calculateMeasurementValue as calcMeasurementValue } from '../domain/annotation-calculation';
import {
  POINT_INHERITANCE_RULES,
  SHARED_ANATOMICAL_POINT_GROUPS,
  getInheritedPoints,
} from '../domain/annotation-inheritance';
import {
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,
} from '../canvas/transform/coordinate-transform';
import { INTERACTION_CONSTANTS } from '../shared/constants';
import { TransformContext } from '../types';
import { useCanvasViewport } from './annotation-canvas/hooks/useCanvasViewport';
import { useCanvasSelection } from './annotation-canvas/hooks/useCanvasSelection';
import { useCanvasContextMenu } from './annotation-canvas/hooks/useCanvasContextMenu';
import { useStandardDistanceInteraction } from './annotation-canvas/hooks/useStandardDistanceInteraction';
import { useCanvasDrag } from './annotation-canvas/hooks/useCanvasDrag';
import { useCanvasDrawingTool } from './annotation-canvas/hooks/useCanvasDrawingTool';
import { useCanvasPointer } from './annotation-canvas/hooks/useCanvasPointer';
import { useVertebradDrag } from './annotation-canvas/hooks/useVertebradDrag';
import { useCanvasDrawing } from './annotation-canvas/hooks/useCanvasDrawing';
import { useCanvasOverlayState } from './annotation-canvas/hooks/useCanvasOverlayState';
import { useCanvasDerivedState } from './annotation-canvas/hooks/useCanvasDerivedState';
import ImageLayer from './annotation-canvas/layers/ImageLayer';
import MeasurementLayer from './annotation-canvas/layers/MeasurementLayer';
import PreviewLayer from './annotation-canvas/layers/PreviewLayer';
import OverlayLayer from './annotation-canvas/layers/OverlayLayer';
import SelectionOverlayLayer from './annotation-canvas/layers/SelectionOverlayLayer';
import MeasurementResultsPanel from './annotation-canvas/panels/MeasurementResultsPanel';
import CanvasControlsPanel from './annotation-canvas/panels/CanvasControlsPanel';
import CanvasHintPanel from './annotation-canvas/panels/CanvasHintPanel';
import renderMeasurement from './annotation-canvas/renderers/renderMeasurement';
import VertebraeLayer from './annotation-canvas/layers/VertebraeLayer';
import {
  keypointIdToRenderCornerRef,
  keypointsToRenderLayer,
  KeypointAnnotation,
} from '../domain/keypoint-state';
import { isDirectlyEditableAnnotation } from '../domain/annotation-editability';
import {
  resolveMeasurementKeypointIds,
  resolveMeasurementPointDragTarget,
} from '../domain/measurement-keypoint-selection';

export default function AnnotationCanvas({
  selectedImage,
  measurements,
  selectedTool,
  setSelectedTool,
  onMeasurementAdd,
  onMeasurementsUpdate,
  onClearAll,
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
  onKeypointDelete,
  onMeasurementWriteback,
}: {
  selectedImage: Pick<ImageData, 'examType'>;
  measurements: MeasurementData[];
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  onMeasurementsUpdate: (measurements: MeasurementData[]) => void;
  onClearAll: () => void;
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
  onKeypointDelete?: (keypointId: string) => void;
  /** 测量点拖动后写回 vertebraeLayer（所有用户都可用） */
  onMeasurementWriteback?: (
    measurementType: string,
    pointIndex: number,
    newPoint: Point,
    measurementId?: string
  ) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    // 显示确认对话框
    if (window.confirm('确定要清空所有标注吗？此操作无法撤销。')) {
      // 清空父组件的测量数据（包括所有测量和辅助图形）
      onClearAll();

      // 清空当前正在绘制的点
      setClickedPoints([]);
    }
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
    onMeasurementsUpdate(
      measurements.filter(item => item.id !== measurementId)
    );
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
  });

  const visibleKeypointLayer =
    keypoints.length > 0
      ? keypointsToRenderLayer(
          keypoints,
          selectedImage.examType,
          hiddenKeypointIds
        )
      : vertebraeLayer;

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
  });
  const hoveredKeypointCorner = keypointIdToCornerRef(hoverState.keypointId);
  const effectiveHoveredCorner =
    vertebradDrag.hoveredCorner ?? hoveredKeypointCorner;

  useEffect(() => {
    if (selectedTool !== 'hand') {
      vertebradDrag.clearHover();
    }
  }, [selectedTool, vertebradDrag.clearHover]);

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
    onMeasurementWriteback,
    imageToScreen,
    screenToImage,
    referenceLines,
    setReferenceLines,
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

  const handleKeypointDelete = (keypointId: string) => {
    setHiddenKeypointIds(previous => {
      const next = new Set(previous);
      next.delete(keypointId);
      return next;
    });
    onKeypointDelete?.(keypointId);
  };

  const handleMeasurementPointDragStart = useCallback(
    (measurementId: string, pointIndex: number, screenPoint: Point) => {
      const measurement = measurements.find(item => item.id === measurementId);
      if (!measurement) return false;

      const target = resolveMeasurementPointDragTarget(
        measurement,
        pointIndex,
        keypoints
      );
      if (!target) return false;

      setSelectedKeypointIds(new Set(target.keypointIds));
      return vertebradDrag.handleKeypointsMouseDown(
        target.keypointIds,
        screenPoint.x,
        screenPoint.y
      );
    },
    [keypoints, measurements, vertebradDrag.handleKeypointsMouseDown]
  );

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
      className={`relative w-full h-full overflow-hidden ${
        (showVertebraeLayer || vertebradDrag.isDragging) &&
        selectedTool === 'hand' &&
        (effectiveHoveredCorner ?? vertebradDrag.activeCorner)
          ? 'cursor-crosshair'
          : getCursorStyle()
      } ${isHovering ? 'ring-2 ring-blue-400/50' : ''}`}
      onMouseDown={e => {
        if (selectedTool.startsWith('keypoint:')) {
          selectMeasurementKeypoints(null);
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
      onMouseUp={e => {
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
      />

      <CanvasControlsPanel
        imageScale={imageScale}
        contrast={contrast}
        brightness={brightness}
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
        {/* 椎体标注层（AI检测结果，admin专属，可隐藏）
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
            selectedKeypointIds={selectedKeypointIds}
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
