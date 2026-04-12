'use client';

import { useEffect, useRef } from 'react';
import { Point, Measurement, ImageData, Tool } from '../types';
import {
  AnnotationBindings,
  PointRef,
} from '../domain/annotation-binding';
import { CalculationContext } from '../catalog/annotation-catalog';
import {
  calculateMeasurementValue as calcMeasurementValue,
} from '../domain/annotation-calculation';
import {
  POINT_INHERITANCE_RULES,
  SHARED_ANATOMICAL_POINT_GROUPS,
  getInheritedPoints,
} from '../domain/annotation-inheritance';
import {
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,
} from '../canvas/transform/coordinate-transform';
import {
  INTERACTION_CONSTANTS,
} from '../shared/constants';
import { TransformContext } from '../types';
import { useCanvasViewport } from './annotation-canvas/hooks/useCanvasViewport';
import { useCanvasSelection } from './annotation-canvas/hooks/useCanvasSelection';
import { useCanvasContextMenu } from './annotation-canvas/hooks/useCanvasContextMenu';
import { useStandardDistanceInteraction } from './annotation-canvas/hooks/useStandardDistanceInteraction';
import { useCanvasDrag } from './annotation-canvas/hooks/useCanvasDrag';
import { useCanvasDrawingTool } from './annotation-canvas/hooks/useCanvasDrawingTool';
import { useCanvasPointer } from './annotation-canvas/hooks/useCanvasPointer';
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
}: {
  selectedImage: Pick<ImageData, 'examType'>;
  measurements: Measurement[];
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  onMeasurementsUpdate: (measurements: Measurement[]) => void;
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
    contextMenu,
    editLabelDialog,
    setEditLabelDialog,
    handleContextMenu,
    handleEditLabel,
    handleDeleteShape,
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
      elementType: measurementId ? 'whole' : null,
      pointIndex: null,
    });
  };

  const handlePanelMeasurementSelect = (measurementId: string) => {
    setSelectedTool('hand');
    if (selectionState.measurementId === measurementId) {
      setSelectionState({
        measurementId: null,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      });
      return;
    }

    setSelectionState({
      measurementId,
      pointIndex: null,
      type: 'whole',
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });
  };

  const handlePanelMeasurementDelete = (measurementId: string) => {
    onMeasurementsUpdate(measurements.filter(item => item.id !== measurementId));
    if (selectionState.measurementId === measurementId) {
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
    drawingState,
    setDrawingState,
    setReferenceLines,
    constrainAuxLinePoint,
    screenToImage,
  });
  const renderVisibleMeasurement = (measurement: Measurement) =>
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
    });

  const handleMouseEnter = () => {
    setIsHovering(true);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsDragging(false);
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  };

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
    onCanvasClick,
    onContextMenu: handleContextMenu,
    setImagePosition,
  });

  return (
    <div
      ref={containerRef}
      data-image-canvas
      className={`relative w-full h-full overflow-hidden ${getCursorStyle()} ${isHovering ? 'ring-2 ring-blue-400/50' : ''}`}
      onMouseDown={pointer.onMouseDown}
      onMouseMove={pointer.onMouseMove}
      onMouseUp={pointer.onMouseUp}
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
        selectionState={selectionState}
        hoverState={hoverState}
        hiddenMeasurementIds={hiddenMeasurementIds}
        hiddenAnnotationIds={hiddenAnnotationIds}
        onToggleResults={toggleResults}
        onToggleAllAnnotations={toggleAllAnnotations}
        onToggleAllLabels={toggleAllLabels}
        onToggleStandardDistanceVisibility={toggleStandardDistanceVisibility}
        onToggleMeasurementAnnotation={toggleMeasurementAnnotation}
        onToggleMeasurementLabel={toggleMeasurementLabel}
        onMeasurementHover={handlePanelMeasurementHover}
        onMeasurementSelect={handlePanelMeasurementSelect}
        onMeasurementDelete={handlePanelMeasurementDelete}
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
        {/* 正式 measurement 渲染统一下沉到 MeasurementLayer + renderMeasurement */}
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
        contextMenu={contextMenu}
        editLabelDialog={editLabelDialog}
        setEditLabelDialog={setEditLabelDialog}
        onEditLabel={handleEditLabel}
        onDeleteShape={handleDeleteShape}
        onSaveLabel={handleSaveLabel}
        onCancelEdit={handleCancelEdit}
      />
    </div>
  );
}
