import { useCallback } from 'react';
import { INTERACTION_CONSTANTS } from '../../../shared/constants';
import { calculateDistance } from '../../../shared/geometry';
import { MeasurementData, Point } from '../../../types';
import { hitTestMeasurement } from '../hitTest/hitTestMeasurement';
import { hitTestWorkingPoint } from '../hitTest/hitTestPoint';
import {
  getMeasurementSelectionBoxInScreen,
  isPointInSelectionBox,
} from '../hitTest/selectionBox';
import { HoverState, SelectionState } from '../types';

interface UseCanvasPointerOptions {
  imageNaturalSize: { width: number; height: number } | null;
  selectedTool: string;
  isManualBindingMode: boolean;
  measurements: MeasurementData[];
  clickedPoints: Point[];
  hideAllAnnotations: boolean;
  hiddenAnnotationIds: Set<string>;
  selectionState: SelectionState;
  setSelectionState: React.Dispatch<React.SetStateAction<SelectionState>>;
  setHoverState: React.Dispatch<React.SetStateAction<HoverState>>;
  imageScale: number;
  imagePosition: Point;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  dragStart: Point;
  setDragStart: React.Dispatch<React.SetStateAction<Point>>;
  adjustMode: string;
  setAdjustMode: React.Dispatch<React.SetStateAction<'none' | 'zoom' | 'brightness' | 'contrast'>>;
  dragStartPos: Point;
  setDragStartPos: React.Dispatch<React.SetStateAction<Point>>;
  brightness: number;
  setBrightness: React.Dispatch<React.SetStateAction<number>>;
  contrast: number;
  setContrast: React.Dispatch<React.SetStateAction<number>>;
  isImagePanLocked: boolean;
  drawingState: { isDrawing: boolean };
  setLiveMouseImagePoint: (point: Point | null) => void;
  imageToScreen: (point: Point) => Point;
  screenToImage: (x: number, y: number) => Point;
  getTransformContext: () => {
    imageNaturalSize: { width: number; height: number } | null;
    imagePosition: Point;
    imageScale: number;
  };
  standardDistanceInteraction: {
    handleMouseDown: (x: number, y: number, button: number) => boolean;
    handleMouseMove: (x: number, y: number, buttons: number) => boolean;
    handleMouseUp: () => void;
  };
  canvasDrag: {
    handleMouseMove: (x: number, y: number, buttons: number) => boolean;
    endDragSelection: () => void;
  };
  drawingTool: {
    handleMouseDown: (x: number, y: number) => boolean;
    handleMouseMove: (x: number, y: number) => boolean;
    handleMouseUp: () => void;
  };
  onManualBindingPointToggle: (annotationId: string, pointIndex: number) => void;
  onCanvasClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  setImagePosition: React.Dispatch<React.SetStateAction<Point>>;
}

/**
 * 指针事件统一调度。
 * 这里承接事件决策，入口组件只绑定 handlers，不再直接保留鼠标状态机。
 */
export function useCanvasPointer({
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
  onContextMenu,
  setImagePosition,
}: UseCanvasPointerOptions) {
  const clearSelection = useCallback(() => {
    setSelectionState({
      measurementId: null,
      pointIndex: null,
      type: null,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });
  }, [setSelectionState]);

  const handleManualBindingMouseDown = useCallback(
    (x: number, y: number) => {
      const screenPoint = { x, y };
      const clickRadius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS;

      for (const measurement of measurements) {
        if (hideAllAnnotations || hiddenAnnotationIds.has(measurement.id)) {
          continue;
        }
        for (let index = 0; index < measurement.points.length; index += 1) {
          const pointScreen = imageToScreen(measurement.points[index]);
          if (calculateDistance(screenPoint, pointScreen) < clickRadius) {
            onManualBindingPointToggle(measurement.id, index);
            return true;
          }
        }
      }

      return true;
    },
    [
      hideAllAnnotations,
      hiddenAnnotationIds,
      imageToScreen,
      measurements,
      onManualBindingPointToggle,
    ]
  );

  const handleViewportMouseDown = useCallback(
    (x: number, y: number) => {
      clearSelection();
      setAdjustMode('zoom');
      setIsDragging(true);
      setDragStart({ x: x - imagePosition.x, y: y - imagePosition.y });
    },
    [clearSelection, imagePosition.x, imagePosition.y, setAdjustMode, setDragStart, setIsDragging]
  );

  const handleHandModeMouseDown = useCallback(
    (x: number, y: number) => {
      const imagePoint = screenToImage(x, y);
      const screenPoint = { x, y };
      const selectionHit = hitTestMeasurement({
        measurements,
        screenPoint,
        imageScale,
        imageToScreen,
        context: getTransformContext(),
        isMeasurementHidden: measurement =>
          hideAllAnnotations || hiddenAnnotationIds.has(measurement.id),
        lineRadius: INTERACTION_CONSTANTS.LINE_CLICK_RADIUS,
      });

      if (selectionHit.kind !== 'none') {
        const selectedMeasurement = measurements.find(
          measurement => measurement.id === selectionHit.measurementId
        );
        if (selectedMeasurement) {
          if (selectionHit.kind === 'point') {
            const point = selectedMeasurement.points[selectionHit.pointIndex];
            setSelectionState({
              measurementId: selectedMeasurement.id,
              pointIndex: selectionHit.pointIndex,
              type: 'point',
              isDragging: false,
              dragOffset: {
                x: imagePoint.x - point.x,
                y: imagePoint.y - point.y,
              },
            });
          } else {
            const xs = selectedMeasurement.points.map(point => point.x);
            const ys = selectedMeasurement.points.map(point => point.y);
            const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
            const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
            setSelectionState({
              measurementId: selectedMeasurement.id,
              pointIndex: null,
              type: 'whole',
              isDragging: false,
              dragOffset: {
                x: imagePoint.x - centerX,
                y: imagePoint.y - centerY,
              },
            });
          }
          return true;
        }
      }

      const workingPointIndex = hitTestWorkingPoint({
        points: clickedPoints,
        screenPoint,
        imageToScreen,
      });
      if (workingPointIndex !== null) {
        const point = clickedPoints[workingPointIndex];
        setSelectionState({
          measurementId: null,
          pointIndex: workingPointIndex,
          type: 'point',
          isDragging: false,
          dragOffset: {
            x: imagePoint.x - point.x,
            y: imagePoint.y - point.y,
          },
        });
        return true;
      }

      if (selectionState.measurementId) {
        const measurement = measurements.find(
          item => item.id === selectionState.measurementId
        );
        if (measurement) {
          if (
            selectionState.type === 'point' &&
            selectionState.pointIndex !== null
          ) {
            const selectedPoint = measurement.points[selectionState.pointIndex];
            const pointBox = {
              minX: imageToScreen(selectedPoint).x - 15,
              maxX: imageToScreen(selectedPoint).x + 15,
              minY: imageToScreen(selectedPoint).y - 15,
              maxY: imageToScreen(selectedPoint).y + 15,
            };
            if (isPointInSelectionBox(screenPoint, pointBox)) {
              setSelectionState(previous => ({
                ...previous,
                dragOffset: {
                  x: imagePoint.x - selectedPoint.x,
                  y: imagePoint.y - selectedPoint.y,
                },
              }));
              return true;
            }
          }

          if (selectionState.type === 'whole') {
            const box = getMeasurementSelectionBoxInScreen(
              measurement,
              imageToScreen
            );
            if (isPointInSelectionBox(screenPoint, box)) {
              const xs = measurement.points.map(point => point.x);
              const ys = measurement.points.map(point => point.y);
              const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
              const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
              setSelectionState(previous => ({
                ...previous,
                dragOffset: {
                  x: imagePoint.x - centerX,
                  y: imagePoint.y - centerY,
                },
              }));
              return true;
            }
          }
        }
      }

      handleViewportMouseDown(x, y);
      return true;
    },
    [
      clickedPoints,
      getTransformContext,
      handleViewportMouseDown,
      hideAllAnnotations,
      hiddenAnnotationIds,
      imageScale,
      imageToScreen,
      measurements,
      screenToImage,
      selectionState.measurementId,
      selectionState.pointIndex,
      selectionState.type,
      setSelectionState,
    ]
  );

  const handleDrawingToolMouseDown = useCallback(
    (x: number, y: number) => drawingTool.handleMouseDown(x, y),
    [drawingTool]
  );

  const handleHandModeHover = useCallback(
    (x: number, y: number) => {
      if (
        selectedTool !== 'hand' ||
        selectionState.isDragging ||
        isDragging ||
        drawingState.isDrawing
      ) {
        setHoverState({
          measurementId: null,
          pointIndex: null,
          elementType: null,
        });
        return;
      }

      const screenPoint = { x, y };
      const hoverHit = hitTestMeasurement({
        measurements,
        screenPoint,
        imageScale,
        imageToScreen,
        context: getTransformContext(),
        isMeasurementHidden: measurement =>
          hideAllAnnotations || hiddenAnnotationIds.has(measurement.id),
        lineRadius: INTERACTION_CONSTANTS.LINE_CLICK_RADIUS,
      });

      if (hoverHit.kind === 'point') {
        setHoverState({
          measurementId: hoverHit.measurementId,
          pointIndex: hoverHit.pointIndex,
          elementType: 'point',
        });
        return;
      }

      if (hoverHit.kind === 'whole' || hoverHit.kind === 'label') {
        setHoverState({
          measurementId: hoverHit.measurementId,
          pointIndex: null,
          elementType: 'whole',
        });
        return;
      }

      const hoveredWorkingPointIndex = hitTestWorkingPoint({
        points: clickedPoints,
        screenPoint,
        imageToScreen,
        radius: INTERACTION_CONSTANTS.HOVER_RADIUS,
      });
      setHoverState({
        measurementId: null,
        pointIndex: hoveredWorkingPointIndex,
        elementType: hoveredWorkingPointIndex !== null ? 'point' : null,
      });
    },
    [
      clickedPoints,
      drawingState.isDrawing,
      getTransformContext,
      hideAllAnnotations,
      hiddenAnnotationIds,
      imageScale,
      imageToScreen,
      isDragging,
      measurements,
      selectedTool,
      selectionState.isDragging,
      setHoverState,
    ]
  );

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button === 0) {
        onCanvasClick();
      }
      if (!imageNaturalSize) {
        console.warn('⚠️ 图像尚未加载完成，请稍候再进行操作');
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (isManualBindingMode && event.button === 0) {
        handleManualBindingMouseDown(x, y);
        return;
      }

      if (standardDistanceInteraction.handleMouseDown(x, y, event.button)) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      setDragStartPos({ x: event.clientX, y: event.clientY });

      if (selectedTool === 'hand') {
        handleHandModeMouseDown(x, y);
        return;
      }

      handleDrawingToolMouseDown(x, y);
    },
    [
      handleDrawingToolMouseDown,
      handleHandModeMouseDown,
      handleManualBindingMouseDown,
      imageNaturalSize,
      isManualBindingMode,
      onCanvasClick,
      selectedTool,
      setDragStartPos,
      standardDistanceInteraction,
    ]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!imageNaturalSize) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setLiveMouseImagePoint(screenToImage(x, y));

      if (standardDistanceInteraction.handleMouseMove(x, y, event.buttons)) {
        return;
      }

      drawingTool.handleMouseMove(x, y);

      if (canvasDrag.handleMouseMove(x, y, event.buttons)) {
        return;
      }

      if (
        adjustMode === 'zoom' &&
        isDragging &&
        selectedTool === 'hand' &&
        !isImagePanLocked
      ) {
        setImagePosition({
          x: x - dragStart.x,
          y: y - dragStart.y,
        });
      } else if (adjustMode === 'brightness' && event.buttons === 1) {
        const deltaX = event.clientX - dragStartPos.x;
        const deltaY = event.clientY - dragStartPos.y;
        setContrast(previous =>
          Math.max(-100, Math.min(100, previous + deltaX * 0.5))
        );
        setBrightness(previous =>
          Math.max(-100, Math.min(100, previous - deltaY * 0.5))
        );
        setDragStartPos({ x: event.clientX, y: event.clientY });
      }

      handleHandModeHover(x, y);
    },
    [
      adjustMode,
      canvasDrag,
      dragStart.x,
      dragStart.y,
      dragStartPos.x,
      dragStartPos.y,
      drawingTool,
      handleHandModeHover,
      imageNaturalSize,
      isDragging,
      isImagePanLocked,
      screenToImage,
      selectedTool,
      setBrightness,
      setContrast,
      setDragStartPos,
      setImagePosition,
      setLiveMouseImagePoint,
      standardDistanceInteraction,
    ]
  );

  const onMouseUp = useCallback(() => {
    standardDistanceInteraction.handleMouseUp();
    canvasDrag.endDragSelection();
    drawingTool.handleMouseUp();
    setIsDragging(false);
    setAdjustMode('none');
  }, [
    canvasDrag,
    drawingTool,
    setAdjustMode,
    setIsDragging,
    standardDistanceInteraction,
  ]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onContextMenu,
  };
}
