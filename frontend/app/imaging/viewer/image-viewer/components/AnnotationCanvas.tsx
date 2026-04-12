'use client';

import { useEffect, useRef } from 'react';
import { Point, Measurement, ImageData, Tool } from '../types';
import {
  AnnotationBindings,
  PointRef,
} from '../domain/annotation-binding';
import { CalculationContext, getAnnotationConfig } from '../catalog/annotation-catalog';
import {
  calculateMeasurementValue as calcMeasurementValue,
} from '../domain/annotation-calculation';
import {
  POINT_INHERITANCE_RULES,
  SHARED_ANATOMICAL_POINT_GROUPS,
  getEffectivePointsNeeded,
  getInheritedPoints,
} from '../domain/annotation-inheritance';
import {
  getDescriptionForType as getDesc,
} from '../domain/annotation-metadata';
import { isAuxiliaryShape as checkIsAuxiliaryShape } from '../canvas/tools/tool-state';
import {
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,
} from '../canvas/transform/coordinate-transform';
import {
  INTERACTION_CONSTANTS,
} from '../shared/constants';
import {
  calculateQuadrilateralCenter,
} from '../shared/geometry';
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
import ImageLayer from './annotation-canvas/layers/ImageLayer';
import MeasurementLayer from './annotation-canvas/layers/MeasurementLayer';
import PreviewLayer from './annotation-canvas/layers/PreviewLayer';
import OverlayLayer from './annotation-canvas/layers/OverlayLayer';
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
    setImageUrl,
    imageLoading,
    setImageLoading,
    imageNaturalSize,
    setImageNaturalSize,
  } = useCanvasViewport();

  // 居中显示指定图像坐标点
  useEffect(() => {
    if (!centerOnPoint || !imageNaturalSize) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // 计算 object-contain 的实际显示尺寸（与 coordinateTransform.ts 保持一致）
    const containerAspect = rect.width / rect.height;
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    let displayWidth: number, displayHeight: number;
    if (containerAspect > imageAspect) {
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
    }

    const scaleX = displayWidth / imageNaturalSize.width;
    const scaleY = displayHeight / imageNaturalSize.height;
    const imageCenterX = imageNaturalSize.width / 2;
    const imageCenterY = imageNaturalSize.height / 2;

    setImagePosition({
      x: -(centerOnPoint.x - imageCenterX) * scaleX * imageScale,
      y: -(centerOnPoint.y - imageCenterY) * scaleY * imageScale,
    });
    onCenterConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOnPoint]);

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

  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();

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

  // 获取图像数据
  useEffect(() => {
    let currentImageUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setImageLoading(true);
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';

        // 使用fetch API直接获取，确保认证头被正确传递
        const { accessToken } =
          require('../../../../../store/authStore').useAuthStore.getState();

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiUrl}/api/v1/image-files/${numericId}/download`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const imageBlob = await response.blob();
        const imageObjectUrl = URL.createObjectURL(imageBlob);
        currentImageUrl = imageObjectUrl;
        setImageUrl(imageObjectUrl);
      } catch (error) {
        console.error('获取图像失败:', error);
        setImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchImage();

    // 清理函数：释放blob URL
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
      }
    };
  }, [imageId]);

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

  // 实际所需点击次数（扣除可从其他标注继承的点位）
  const pointsNeeded = currentTool
    ? getEffectivePointsNeeded(
        currentTool.id,
        currentTool.pointsNeeded,
        measurements
      )
    : 2;
  const visibleMeasurements = measurements.filter(
    (measurement: Measurement) =>
      !hideAllAnnotations && !hiddenAnnotationIds.has(measurement.id)
  );
  const orderedVisibleMeasurements = [
    ...visibleMeasurements.filter(
      (measurement: Measurement) =>
        !(
          hoverState.measurementId === measurement.id &&
          hoverState.elementType === 'whole'
        )
    ),
    ...visibleMeasurements.filter(
      (measurement: Measurement) =>
        hoverState.measurementId === measurement.id &&
        hoverState.elementType === 'whole'
    ),
  ];
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

  const handleDoubleClick = () => {
    // 双击重置视图
    resetView();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isHovering) {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      // 使用函数式更新，避免闭包问题
      setImageScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
    }
  };

  // 使用useEffect添加非被动的wheel事件监听器和键盘快捷键
  useEffect(() => {
    const container = document.querySelector(
      '[data-image-canvas]'
    ) as HTMLElement;
    if (!container) return;

    const handleWheelEvent = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      wheelEvent.preventDefault();
      wheelEvent.stopPropagation();
      // 改进：使用更小的步长，便于精确调整
      const delta = wheelEvent.deltaY > 0 ? 0.95 : 1.05;
      // 使用函数式更新，避免依赖 imageScale
      setImageScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
    };

    // 键盘快捷键处理
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框内，如果是则不处理快捷键
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // R 键：重置视图到 100%
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetView();
      }
      // 1 键：快速设置为 100%
      if (e.key === '1') {
        e.preventDefault();
        setImageScale(1);
      }
      // + 键：放大
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setImageScale(prev => Math.min(5, prev * 1.2));
      }
      // - 键：缩小
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setImageScale(prev => Math.max(0.1, prev * 0.8));
      }
    };

    container.addEventListener('wheel', handleWheelEvent as EventListener, {
      passive: false,
    });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      // 安全地移除事件监听器
      if (container && container.removeEventListener) {
        container.removeEventListener(
          'wheel',
          handleWheelEvent as EventListener
        );
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const resetView = () => {
    console.log('🔄 resetView 被调用，将重置 imageScale 为 1');
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setClickedPoints([]);
    // 不改变当前选中的工具
  };

  const clearCurrentMeasurement = () => {
    setClickedPoints([]);
    clearReferenceLinesForTool('');
  };

  const getCursorStyle = () => {
    if (isSettingStandardDistance) return 'cursor-crosshair';
    if (selectedTool === 'hand') return 'cursor-grab active:cursor-grabbing';
    return 'cursor-crosshair';
  };

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
      {/* 左上角测量结果展示区 */}
      <div
        className="absolute top-4 left-48 z-50"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onPointerMove={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden w-[240px]">
          <div className="flex items-center justify-between px-3 py-2 bg-black/20 w-full">
            <div className="flex items-center min-w-0">
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleAllAnnotations();
                }}
                className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 mr-1"
                title={hideAllAnnotations ? '显示所有标注' : '隐藏所有标注'}
              >
                <i
                  className={`${hideAllAnnotations ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}
                ></i>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleAllLabels();
                }}
                className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 mr-2"
                title={hideAllLabels ? '显示所有标识' : '隐藏所有标识'}
              >
                <i
                  className={`${hideAllLabels ? 'ri-format-clear' : 'ri-text'} text-sm`}
                ></i>
              </button>
              <span className="text-white text-xs font-medium whitespace-nowrap">
                测量结果
              </span>
            </div>
            <button
              onClick={toggleResults}
              className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2"
            >
              <i
                className={`${showResults ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}
              ></i>
            </button>
          </div>

          {showResults && (
            <div
              className="max-h-[50vh] overflow-y-auto"
              onWheel={e => e.stopPropagation()}
            >
              {(standardDistance !== null &&
                standardDistancePoints.length === 2) ||
              measurements.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {/* 标准距离显示项 - 始终显示在最前面 */}
                  {standardDistance !== null &&
                    standardDistancePoints.length === 2 && (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40">
                        {/* 标注显示按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleStandardDistanceVisibility();
                          }}
                          className="text-purple-400/60 hover:text-purple-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={
                            isStandardDistanceHidden ? '显示标注' : '隐藏标注'
                          }
                        >
                          <i
                            className={`${isStandardDistanceHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        {/* 标识显示占位（保持对齐） */}
                        <div className="w-4 h-4 flex-shrink-0"></div>

                        {/* 中间内容区域 */}
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate mr-2 font-medium text-purple-300">
                            标准距离
                          </span>
                          <span className="font-mono whitespace-nowrap text-purple-200">
                            {standardDistance}mm
                          </span>
                        </div>

                        {/* 右侧占位（保持对齐） */}
                        <div className="w-4 h-4 flex-shrink-0"></div>
                      </div>
                    )}

                  {measurements.map(measurement => {
                    // 判断当前测量是否被选中或悬浮（优化：使用selectionState）
                    const isSelected =
                      selectionState.measurementId === measurement.id;
                    const isHovered =
                      !isSelected &&
                      hoverState.measurementId === measurement.id;
                    const isLabelHidden = hiddenMeasurementIds.has(
                      measurement.id
                    );
                    const isAnnotationHidden = hiddenAnnotationIds.has(
                      measurement.id
                    );

                    return (
                      <div
                        key={measurement.id}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                          isSelected
                            ? 'bg-white/20 border border-white/50'
                            : isHovered
                              ? 'bg-yellow-500/20 border border-yellow-500/40'
                              : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {/* 左侧标注显示按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleMeasurementAnnotation(measurement.id);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isAnnotationHidden ? '显示标注' : '隐藏标注'}
                        >
                          <i
                            className={`${isAnnotationHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        {/* 标识显示按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleMeasurementLabel(measurement.id);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isLabelHidden ? '显示标识' : '隐藏标识'}
                        >
                          <i
                            className={`${isLabelHidden ? 'ri-format-clear' : 'ri-text'} text-xs`}
                          ></i>
                        </button>

                        {/* 中间内容区域 */}
                        <div
                          className="flex-1 flex items-center justify-between cursor-pointer min-w-0"
                          onMouseEnter={e => {
                            e.stopPropagation();
                            setHoverState({
                              measurementId: measurement.id,
                              elementType: 'whole',
                              pointIndex: null,
                            });
                          }}
                          onMouseLeave={e => {
                            e.stopPropagation();
                            setHoverState({
                              measurementId: null,
                              elementType: null,
                              pointIndex: null,
                            });
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            // 在左侧测量结果面板中点击标注时，优先级最高，自动切换为移动模式
                            setSelectedTool('hand');

                            if (
                              selectionState.measurementId === measurement.id
                            ) {
                              // 如果已选中，则取消选中（优化：使用selectionState）
                              setSelectionState({
                                measurementId: null,
                                pointIndex: null,
                                type: null,
                                isDragging: false,
                                dragOffset: { x: 0, y: 0 },
                              });
                            } else {
                              // 选中该测量（优化：使用selectionState）
                              setSelectionState({
                                measurementId: measurement.id,
                                pointIndex: null,
                                type: 'whole',
                                isDragging: false,
                                dragOffset: { x: 0, y: 0 },
                              });
                            }
                          }}
                          title={
                            // 方案C：悬浮时显示完整椎体信息
                            measurement.upperVertebra &&
                            measurement.lowerVertebra &&
                            measurement.apexVertebra
                              ? `上端椎: ${measurement.upperVertebra} | 下端椎: ${measurement.lowerVertebra} | 顶椎: ${measurement.apexVertebra}`
                              : undefined
                          }
                        >
                          <span
                            className={`truncate mr-2 font-medium ${
                              isSelected
                                ? 'text-white'
                                : isHovered
                                  ? 'text-yellow-300'
                                  : 'text-white/90'
                            }`}
                          >
                            {/* 对于辅助图形，如果有自定义description则显示，否则显示type */}
                            {checkIsAuxiliaryShape(measurement.type) &&
                            measurement.description &&
                            measurement.description !==
                              getDesc(measurement.type)
                              ? measurement.description
                              : measurement.type}
                          </span>
                          <span
                            className={`font-mono whitespace-nowrap ${
                              isSelected
                                ? 'text-white'
                                : isHovered
                                  ? measurement.value.startsWith('-')
                                    ? 'text-blue-300'
                                    : 'text-yellow-200'
                                  : measurement.value.startsWith('-')
                                    ? 'text-blue-400'
                                    : 'text-yellow-400'
                            }`}
                          >
                            {/* 方案B：紧凑显示椎体范围 */}
                            {measurement.value}
                            {measurement.upperVertebra &&
                              measurement.lowerVertebra && (
                                <span className="text-white/60 text-xs ml-1">
                                  ({measurement.upperVertebra}-
                                  {measurement.lowerVertebra})
                                </span>
                              )}
                          </span>
                        </div>

                        {/* 右侧删除按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onMeasurementsUpdate(
                              measurements.filter(m => m.id !== measurement.id)
                            );
                            // 如果删除的是选中项，清除选中状态（优化：使用selectionState）
                            if (
                              selectionState.measurementId === measurement.id
                            ) {
                              setSelectionState({
                                measurementId: null,
                                pointIndex: null,
                                type: null,
                                isDragging: false,
                                dragOffset: { x: 0, y: 0 },
                              });
                            }
                            removeMeasurementVisibility(measurement.id);
                          }}
                          className="text-red-400/60 hover:text-red-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title="删除标注"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <i className="ri-ruler-line w-4 h-4 flex items-center justify-center mx-auto mb-1 text-white/60"></i>
                  <p className="text-xs text-white/60">暂无测量数据</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 右上角控制工具栏 */}
      <div
        className="absolute top-4 right-4 z-10 bg-black/80 border border-blue-500/30 backdrop-blur-sm rounded-lg p-3 flex flex-col gap-3 min-w-max"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onDoubleClick={e => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🚫 控制面板阻止了双击事件');
        }}
      >
        {/* 清空按钮 */}
        <div className="flex items-center justify-center">
          <button
            onClick={e => {
              e.stopPropagation();
              handleClear();
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-xs font-medium transition-all active:scale-95 w-full justify-center"
            title="清空所有标注"
          >
            <i className="ri-delete-bin-line"></i>
            <span>清空全部</span>
          </button>
        </div>

        {/* 缩放调节 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-white text-xs whitespace-nowrap">缩放</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setImageScale(prev => {
                const newScale = Math.max(0.1, prev * 0.8);
                return newScale;
              });
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="缩小 (快捷键: -)"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-8 text-center">
            {(() => {
              const percentage = Math.round(imageScale * 100);
              return percentage + '%';
            })()}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setImageScale(prev => {
                const newScale = Math.min(5, prev * 1.2);
                return newScale;
              });
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="放大 (快捷键: +)"
          >
            +
          </button>
        </div>

        {/* 对比度调节 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-white text-xs whitespace-nowrap">对比度</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setContrast(prev => Math.max(-100, prev - 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="降低对比度"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-6 text-center">
            {Math.round(contrast)}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setContrast(prev => Math.min(100, prev + 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="提高对比度"
          >
            +
          </button>
        </div>

        {/* 亮度调节 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-white text-xs whitespace-nowrap">亮度</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setBrightness(prev => Math.max(-100, prev - 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="降低亮度"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-6 text-center">
            {Math.round(brightness)}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setBrightness(prev => Math.min(100, prev + 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="提高亮度"
          >
            +
          </button>
        </div>
      </div>

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
            onLoad={e => {
              const img = e.target as HTMLImageElement;
              const size = {
                width: img.naturalWidth,
                height: img.naturalHeight,
              };
              setImageNaturalSize(size);
              onImageSizeChange(size);
              console.log('图像加载完成，原始尺寸:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                displayWidth: img.width,
                displayHeight: img.height,
              });
            }}
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
        {/* 绘制当前点击的点 */}
        {clickedPoints.map((point, index) => {
          const screenPoint = imageToScreen(point);
          // 检查是否为悬浮高亮状态
          const isHovered =
            !hoverState.measurementId &&
            hoverState.elementType === 'point' &&
            hoverState.pointIndex === index;

          return (
            <g key={`current-${index}`}>
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r={isHovered ? '6' : '4'}
                fill="#ef4444"
                stroke={isHovered ? '#fbbf24' : '#ffffff'}
                strokeWidth={isHovered ? '3' : '2'}
              />
              {/* 悬浮时的外层高亮圆圈 */}
              {isHovered && (
                <circle
                  cx={screenPoint.x}
                  cy={screenPoint.y}
                  r="9"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.6"
                />
              )}
              {/* 点序号背景 */}
              <rect
                x={screenPoint.x + 4}
                y={screenPoint.y - (isHovered ? 16 : 14)}
                width={(isHovered ? 14 : 12) * 0.7}
                height={(isHovered ? 14 : 12) * 1.0}
                fill="white"
                opacity="0.9"
                rx="2"
              />
              <text
                x={screenPoint.x + (isHovered ? 8.5 : 7.5)}
                y={screenPoint.y - (isHovered ? 4 : 4)}
                fill={isHovered ? '#fbbf24' : '#ef4444'}
                fontSize={isHovered ? '14' : '12'}
                fontWeight="bold"
              >
                {index + 1}
              </text>
            </g>
          );
        })}
        <PreviewLayer
          selectedTool={selectedTool}
          currentTool={currentTool ?? null}
          clickedPoints={clickedPoints}
          measurements={measurements}
          referenceLines={referenceLines}
          standardDistancePoints={standardDistancePoints}
          hoveredStandardPointIndex={hoveredStandardPointIndex}
          draggingStandardPointIndex={draggingStandardPointIndex}
          isStandardDistanceHidden={isStandardDistanceHidden}
          imageScale={imageScale}
          liveMouseImagePoint={liveMouseImagePoint}
          drawingState={drawingState}
          imageToScreen={imageToScreen}
          getInheritedPoints={getInheritedPoints}
        >
          <></>
        </PreviewLayer>
        {/* 绘制圆形预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'circle' &&
          (() => {
            const startScreen = imageToScreen(drawingState.startPoint);
            const endScreen = imageToScreen(drawingState.currentPoint);
            const radius = Math.sqrt(
              Math.pow(endScreen.x - startScreen.x, 2) +
                Math.pow(endScreen.y - startScreen.y, 2)
            );
            return (
              <circle
                key="circle-preview"
                cx={startScreen.x}
                cy={startScreen.y}
                r={radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制椭圆预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'ellipse' &&
          (() => {
            const startScreen = imageToScreen(drawingState.startPoint);
            const endScreen = imageToScreen(drawingState.currentPoint);
            return (
              <ellipse
                key="ellipse-preview"
                cx={startScreen.x}
                cy={startScreen.y}
                rx={Math.abs(endScreen.x - startScreen.x)}
                ry={Math.abs(endScreen.y - startScreen.y)}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制矩形预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'rectangle' &&
          (() => {
            const startScreen = imageToScreen(drawingState.startPoint);
            const endScreen = imageToScreen(drawingState.currentPoint);
            return (
              <rect
                key="rectangle-preview"
                x={Math.min(startScreen.x, endScreen.x)}
                y={Math.min(startScreen.y, endScreen.y)}
                width={Math.abs(endScreen.x - startScreen.x)}
                height={Math.abs(endScreen.y - startScreen.y)}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制箭头预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'arrow' &&
          (() => {
            const start = imageToScreen(drawingState.startPoint);
            const end = imageToScreen(drawingState.currentPoint);
            return (
              <line
                key="arrow-preview"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#f59e0b"
                strokeWidth="2"
                markerEnd="url(#arrowhead-normal)"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制多边形预览 - 使用 clickedPoints */}
        {selectedTool === 'polygon' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`polygon-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#06b6d4"
                    opacity="0.8"
                  />
                ))}
                {/* 绘制连接线 */}
                {screenPoints.length > 1 && (
                  <>
                    {screenPoints.slice(0, -1).map((point, idx) => (
                      <line
                        key={`polygon-line-${idx}`}
                        x1={point.x}
                        y1={point.y}
                        x2={screenPoints[idx + 1].x}
                        y2={screenPoints[idx + 1].y}
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    ))}
                  </>
                )}
              </>
            );
          })()}
        {/* 绘制锥体中心预览 - 使用 clickedPoints */}
        {selectedTool === 'vertebra-center' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的角点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`vertebra-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#10b981"
                    opacity="0.8"
                  />
                ))}
                {/* 绘制连接线 */}
                {screenPoints.length > 1 && (
                  <>
                    {screenPoints.slice(0, -1).map((point, idx) => (
                      <line
                        key={`vertebra-line-${idx}`}
                        x1={point.x}
                        y1={point.y}
                        x2={screenPoints[idx + 1].x}
                        y2={screenPoints[idx + 1].y}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    ))}
                    {/* 如果有3个或4个点，连接最后一个点到第一个点 */}
                    {screenPoints.length >= 3 && (
                      <line
                        key="vertebra-line-close"
                        x1={screenPoints[screenPoints.length - 1].x}
                        y1={screenPoints[screenPoints.length - 1].y}
                        x2={screenPoints[0].x}
                        y2={screenPoints[0].y}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    )}
                  </>
                )}
                {/* 如果已经有4个点，显示中心点预览 */}
                {clickedPoints.length === 4 &&
                  (() => {
                    const center = calculateQuadrilateralCenter(clickedPoints);
                    const centerScreen = imageToScreen(center);
                    return (
                      <g>
                        <circle
                          cx={centerScreen.x}
                          cy={centerScreen.y}
                          r="6"
                          fill="#10b981"
                          opacity="0.5"
                        />
                        <text
                          x={centerScreen.x}
                          y={centerScreen.y - 12}
                          fill="#10b981"
                          fontSize="12"
                          textAnchor="middle"
                          opacity="0.7"
                        >
                          中心
                        </text>
                      </g>
                    );
                  })()}
              </>
            );
          })()}
        {/* 绘制距离标注预览 - 使用 clickedPoints */}
        {selectedTool === 'aux-length' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`aux-length-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#3b82f6"
                    opacity="0.8"
                  />
                ))}
                {/* 如果有2个点，绘制线段和距离 */}
                {screenPoints.length === 2 &&
                  (() => {
                    const config = getAnnotationConfig('aux-length');
                    const results =
                      config?.calculateResults(clickedPoints, {
                        standardDistance,
                        standardDistancePoints,
                        imageNaturalSize,
                      }) || [];
                    const distanceText =
                      results.length > 0
                        ? `${results[0].value}${results[0].unit}`
                        : '';
                    const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
                    const midY = (screenPoints[0].y + screenPoints[1].y) / 2;

                    return (
                      <>
                        <line
                          x1={screenPoints[0].x}
                          y1={screenPoints[0].y}
                          x2={screenPoints[1].x}
                          y2={screenPoints[1].y}
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.6"
                        />
                        <text
                          x={midX}
                          y={midY - 10}
                          fill="#3b82f6"
                          fontSize="12"
                          textAnchor="middle"
                          opacity="0.7"
                        >
                          {distanceText}
                        </text>
                      </>
                    );
                  })()}
              </>
            );
          })()}
        {/* TTS 工具的水平线预览（第二点自动约束为水平） */}
        {selectedTool.includes('ts') &&
          clickedPoints.length === 1 &&
          liveMouseImagePoint &&
          (() => {
            const firstPoint = imageToScreen(clickedPoints[0]);
            const constrainedSecondPoint = imageToScreen({
              x: liveMouseImagePoint.x,
              y: clickedPoints[0].y, // 约束Y坐标与第一个点相同
            });
            return (
              <line
                x1={firstPoint.x}
                y1={firstPoint.y}
                x2={constrainedSecondPoint.x}
                y2={constrainedSecondPoint.y}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            );
          })()}
        {/* 绘制辅助水平/垂直线段预览（第二点自动约束） */}
        {(selectedTool === 'aux-horizontal-line' ||
          selectedTool === 'aux-vertical-line') &&
          clickedPoints.length > 0 &&
          (() => {
            const previewPoints = [...clickedPoints];
            if (clickedPoints.length === 1 && liveMouseImagePoint) {
              previewPoints.push(
                constrainAuxLinePoint(
                  selectedTool,
                  clickedPoints[0],
                  liveMouseImagePoint
                )
              );
            }

            const screenPreviewPoints = previewPoints.map(p =>
              imageToScreen(p)
            );

            return (
              <>
                {screenPreviewPoints.map((point, idx) => (
                  <circle
                    key={`aux-orth-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#22c55e"
                    opacity="0.85"
                  />
                ))}

                {screenPreviewPoints.length === 2 && (
                  <line
                    x1={screenPreviewPoints[0].x}
                    y1={screenPreviewPoints[0].y}
                    x2={screenPreviewPoints[1].x}
                    y2={screenPreviewPoints[1].y}
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                )}
              </>
            );
          })()}
        {/* 绘制角度标注预览 - 使用 clickedPoints */}
        {selectedTool === 'aux-angle' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`aux-angle-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#8b5cf6"
                    opacity="0.8"
                  />
                ))}
                {/* 绘制线段 */}
                {screenPoints.length >= 2 && (
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                )}
                {screenPoints.length >= 4 && (
                  <line
                    x1={screenPoints[2].x}
                    y1={screenPoints[2].y}
                    x2={screenPoints[3].x}
                    y2={screenPoints[3].y}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                )}
                {screenPoints.length === 4 && (
                  <>
                    {(() => {
                      const config = getAnnotationConfig('aux-angle');
                      const results =
                        config?.calculateResults(clickedPoints, {
                          standardDistance,
                          standardDistancePoints,
                          imageNaturalSize,
                        }) || [];
                      const angleText =
                        results.length > 0
                          ? `${results[0].value}${results[0].unit}`
                          : '';
                      const centerPoint = {
                        x:
                          (screenPoints[0].x +
                            screenPoints[1].x +
                            screenPoints[2].x +
                            screenPoints[3].x) /
                          4,
                        y:
                          (screenPoints[0].y +
                            screenPoints[1].y +
                            screenPoints[2].y +
                            screenPoints[3].y) /
                          4,
                      };
                      return (
                        <text
                          x={centerPoint.x}
                          y={centerPoint.y - 15}
                          fill="#8b5cf6"
                          fontSize="12"
                          textAnchor="middle"
                          opacity="0.7"
                        >
                          {angleText}
                        </text>
                      );
                    })()}
                  </>
                )}
              </>
            );
          })()}
        {/* 选中边界框和删除按钮 */}
        {(() => {
          // 获取选中的对象
          let selectedPoints: Point[] = [];
          let selectedMeasurement: any = null;

          if (selectionState.measurementId) {
            // 选中了测量结果（优化：使用selectionState）
            const measurement = measurements.find(
              m => m.id === selectionState.measurementId
            );
            if (measurement) {
              selectedMeasurement = measurement;
              if (
                selectionState.type === 'point' &&
                selectionState.pointIndex !== null
              ) {
                // 只显示选中的点
                selectedPoints = [
                  measurement.points[selectionState.pointIndex],
                ];
              } else {
                // 显示整个测量结果
                selectedPoints = measurement.points;
              }
            }
          } else if (
            selectionState.pointIndex !== null &&
            clickedPoints[selectionState.pointIndex]
          ) {
            // 选中了单个点
            selectedPoints = [clickedPoints[selectionState.pointIndex]];
          }

          if (selectedPoints.length === 0) return null;

          // 计算边界框
          let minX: number, maxX: number, minY: number, maxY: number;

          // 针对不同类型的图形计算不同的边界框（优化：使用selectionState）
          if (selectedMeasurement && selectionState.type === 'whole') {
            // 辅助图形需要特殊处理
            if (
              selectedMeasurement.type === '圆形标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const center = selectedMeasurement.points[0];
              const edge = selectedMeasurement.points[1];
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const screenRadius = Math.sqrt(
                Math.pow(screenEdge.x - screenCenter.x, 2) +
                  Math.pow(screenEdge.y - screenCenter.y, 2)
              );

              minX = screenCenter.x - screenRadius - 15;
              maxX = screenCenter.x + screenRadius + 15;
              minY = screenCenter.y - screenRadius - 15;
              maxY = screenCenter.y + screenRadius + 15;
            } else if (
              selectedMeasurement.type === '椭圆标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const center = selectedMeasurement.points[0];
              const edge = selectedMeasurement.points[1];
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const screenRadiusX = Math.abs(screenEdge.x - screenCenter.x);
              const screenRadiusY = Math.abs(screenEdge.y - screenCenter.y);

              minX = screenCenter.x - screenRadiusX - 15;
              maxX = screenCenter.x + screenRadiusX + 15;
              minY = screenCenter.y - screenRadiusY - 15;
              maxY = screenCenter.y + screenRadiusY + 15;
            } else if (
              selectedMeasurement.type === '矩形标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const start = selectedMeasurement.points[0];
              const end = selectedMeasurement.points[1];
              const startScreen = imageToScreen(start);
              const endScreen = imageToScreen(end);

              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else if (
              selectedMeasurement.type === '箭头标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const start = selectedMeasurement.points[0];
              const end = selectedMeasurement.points[1];
              const startScreen = imageToScreen(start);
              const endScreen = imageToScreen(end);

              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else {
              // 默认处理：基于标注点位置
              const screenPoints = selectedPoints.map(p => imageToScreen(p));
              const xs = screenPoints.map(p => p.x);
              const ys = screenPoints.map(p => p.y);
              minX = Math.min(...xs) - 15;
              maxX = Math.max(...xs) + 15;
              minY = Math.min(...ys) - 15;
              maxY = Math.max(...ys) + 15;
            }
          } else {
            // 点选择模式或普通测量：基于标注点位置
            const screenPoints = selectedPoints.map(p => imageToScreen(p));
            const xs = screenPoints.map(p => p.x);
            const ys = screenPoints.map(p => p.y);
            minX = Math.min(...xs) - 15;
            maxX = Math.max(...xs) + 15;
            minY = Math.min(...ys) - 15;
            maxY = Math.max(...ys) + 15;
          }

          const width = maxX - minX;
          const height = maxY - minY;

          return (
            <g>
              {/* 边界框 */}
              <rect
                x={minX}
                y={minY}
                width={width}
                height={height}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.8"
              />
            </g>
          );
        })()}
      </svg>

      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 max-w-md">
        {selectedTool.toLowerCase() === 'cobb' && (
          <div className="bg-black/75 border border-yellow-400/40 text-white text-xs px-3 py-2 rounded">
            <p className="font-medium text-yellow-300">Cobb 点位顺序提示</p>
            <p className="mt-1">
              1 上端椎左 | 2 上端椎右 | 3 下端椎左 | 4 下端椎右
            </p>
          </div>
        )}

        <div className="bg-black/70 text-white text-xs px-3 py-2 rounded">
          {selectedTool === 'hand' ? (
            <div>
              <p className="font-medium">
                移动模式{' '}
                {isImagePanLocked && (
                  <span className="text-yellow-400">🔒 图像已锁定</span>
                )}
              </p>
              <p>点击选中标注 | 拖拽移动 | 点击删除按钮删除</p>
              <p className="text-gray-400 mt-1">
                {isImagePanLocked
                  ? '图像已锁定，拖拽不会移动图像'
                  : '或拖拽移动图像'}{' '}
                | 滚轮缩放
              </p>
            </div>
          ) : selectedTool === 'polygon' ? (
            <div>
              <p className="font-medium">多边形标注模式</p>
              <p>已标注 {clickedPoints.length} 个点</p>
              {clickedPoints.length < 3 ? (
                <p className="text-yellow-400 mt-1">至少需要3个点</p>
              ) : (
                <div className="text-green-400 mt-1">
                  <p>点击回第一个点自动闭合</p>
                  <p>Alt+Z 撤销点</p>
                </div>
              )}
            </div>
          ) : selectedTool === 'vertebra-center' ? (
            <div>
              <p className="font-medium">锥体中心标注模式</p>
              <p>已标注 {clickedPoints.length}/4 个角点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第1个角点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">点击第2个角点</p>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-yellow-400 mt-1">点击第3个角点</p>
              )}
              {clickedPoints.length === 3 && (
                <div className="text-green-400 mt-1">
                  <p>点击第4个角点完成标注</p>
                  <p>中心点将自动计算</p>
                </div>
              )}
            </div>
          ) : selectedTool === 'aux-length' ? (
            <div>
              <p className="font-medium">距离标注模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击起点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">点击终点完成测量</p>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-green-400 mt-1">
                  距离已计算（根据标准距离换算）
                </p>
              )}
            </div>
          ) : selectedTool === 'aux-horizontal-line' ? (
            <div>
              <p className="font-medium">辅助水平线段模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第1个点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">
                  点击第2个点（自动保持水平）
                </p>
              )}
            </div>
          ) : selectedTool === 'aux-vertical-line' ? (
            <div>
              <p className="font-medium">辅助垂直线段模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第1个点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">
                  点击第2个点（自动保持垂直）
                </p>
              )}
            </div>
          ) : selectedTool === 'aux-angle' ? (
            <div>
              <p className="font-medium">角度标注模式（两条线段）</p>
              <p>已标注 {clickedPoints.length}/4 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第一条线段的起点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">点击第一条线段的终点</p>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-yellow-400 mt-1">点击第二条线段的起点</p>
              )}
              {clickedPoints.length === 3 && (
                <p className="text-yellow-400 mt-1">
                  点击第二条线段的终点完成测量
                </p>
              )}
              {clickedPoints.length === 4 && (
                <p className="text-green-400 mt-1">角度已计算</p>
              )}
            </div>
          ) : selectedTool.includes('t1-tilt') ? (
            <div>
              <p className="font-medium">T1 Tilt 测量模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击T1椎体上终板起点</p>
              )}
              {clickedPoints.length === 1 && (
                <>
                  <p className="text-green-400 mt-1">水平参考线已显示</p>
                  <p className="text-yellow-400 mt-1">点击上终板终点完成测量</p>
                </>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-green-400 mt-1">T1 Tilt角度已计算</p>
              )}
            </div>
          ) : (
            <div>
              <p className="font-medium">测量模式: {currentTool?.name}</p>
              <p>
                已标注 {clickedPoints.length}/{pointsNeeded} 个点
                {currentTool &&
                  getInheritedPoints(currentTool.id, measurements).count >
                    0 && (
                    <span className="text-cyan-400 ml-2 text-xs">
                      (+{getInheritedPoints(currentTool.id, measurements).count}
                      个点已自动继承)
                    </span>
                  )}
              </p>
              {clickedPoints.length < pointsNeeded && (
                <p className="text-yellow-400 mt-1">点击图像标注关键点</p>
              )}
            </div>
          )}
          {isHovering && <p className="text-blue-400 mt-1">滚轮缩放已激活</p>}
        </div>
      </div>

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
