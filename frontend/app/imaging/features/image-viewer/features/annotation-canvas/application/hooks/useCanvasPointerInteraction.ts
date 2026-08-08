import { useCallback } from 'react';
import { calculateDistance } from '@/app/imaging/features/image-viewer/shared/geometry';
import {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { TransformContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/viewport-transform';
import { hitTestMeasurement } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hit-test/hitTestMeasurement';
import { hitTestWorkingPoint } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hit-test/hitTestPoint';
import {
  getMeasurementSelectionBoxInScreen,
  isPointInSelectionBox,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hit-test/selectionBox';
import {
  HoverState,
  SelectionState,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';
import { getManualTtsTrunkCenter } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/tts';
import type { CanvasPointerInput } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/input/pointer-input';
import { getPelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';

function getMeasurementDragCenter(measurement: MeasurementData): Point {
  const ttsTrunkCenter = getManualTtsTrunkCenter(measurement);
  if (ttsTrunkCenter) return ttsTrunkCenter;

  const xs = measurement.points.map(point => point.x);
  const ys = measurement.points.map(point => point.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

interface UseCanvasPointerInteractionOptions {
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
  setAdjustMode: React.Dispatch<
    React.SetStateAction<'none' | 'zoom' | 'brightness' | 'contrast'>
  >;
  dragStartPos: Point;
  setDragStartPos: React.Dispatch<React.SetStateAction<Point>>;
  brightness: number;
  setBrightness: React.Dispatch<React.SetStateAction<number>>;
  contrast: number;
  setContrast: React.Dispatch<React.SetStateAction<number>>;
  isImagePanLocked: boolean;
  drawingState: { isDrawing: boolean };
  setLivePointerImagePoint: (point: Point | null) => void;
  imageToScreen: (point: Point) => Point;
  screenToImage: (x: number, y: number) => Point;
  getTransformContext: () => TransformContext;
  standardDistanceInteraction: {
    beginInteraction: (x: number, y: number, pointHitRadius: number) => boolean;
    updateInteraction: (
      x: number,
      y: number,
      primaryActionPressed: boolean,
      supportsHover: boolean,
      pointHitRadius: number,
      dragStartThreshold: number
    ) => boolean;
    endInteraction: () => void;
  };
  canvasDrag: {
    beginInteraction: (x: number, y: number) => void;
    updateInteraction: (
      x: number,
      y: number,
      primaryActionPressed: boolean,
      dragStartThreshold: number
    ) => boolean;
    endDragSelection: () => void;
  };
  drawingTool: {
    beginInteraction: (x: number, y: number) => boolean;
    updateInteraction: (x: number, y: number) => boolean;
    endInteraction: () => void;
  };
  onManualBindingPointToggle: (
    annotationId: string,
    pointIndex: number
  ) => void;
  onDisplayMeasurementSelect: (measurementId: string | null) => void;
  onCanvasClick: () => void;
  setImagePosition: React.Dispatch<React.SetStateAction<Point>>;
}

/**
 * 指针事件统一调度。
 * 这里承接事件决策，入口组件只绑定 handlers，不再直接保留鼠标状态机。
 */
export function useCanvasPointerInteraction({
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
  setBrightness,
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
  onDisplayMeasurementSelect,
  onCanvasClick,
  setImagePosition,
}: UseCanvasPointerInteractionOptions) {
  const clearSelection = useCallback(() => {
    onDisplayMeasurementSelect(null);
    setSelectionState({
      measurementId: null,
      pointIndex: null,
      type: null,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });
  }, [onDisplayMeasurementSelect, setSelectionState]);

  const handleManualBindingPointerDown = useCallback(
    (x: number, y: number, pointHitRadius: number) => {
      const screenPoint = { x, y };

      for (const measurement of measurements) {
        if (hideAllAnnotations || hiddenAnnotationIds.has(measurement.id)) {
          continue;
        }
        for (let index = 0; index < measurement.points.length; index += 1) {
          const pointScreen = imageToScreen(measurement.points[index]);
          if (calculateDistance(screenPoint, pointScreen) < pointHitRadius) {
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

  const beginViewportInteraction = useCallback(
    (x: number, y: number) => {
      clearSelection();
      setAdjustMode('zoom');
      setIsDragging(true);
      setDragStart({ x: x - imagePosition.x, y: y - imagePosition.y });
    },
    [
      clearSelection,
      imagePosition.x,
      imagePosition.y,
      setAdjustMode,
      setDragStart,
      setIsDragging,
    ]
  );

  const beginHandModeInteraction = useCallback(
    (x: number, y: number, input: CanvasPointerInput) => {
      canvasDrag.beginInteraction(x, y);
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
        pointRadius: input.policy.pointHitRadius,
        lineRadius: input.policy.lineHitRadius,
      });

      if (selectionHit.kind !== 'none') {
        const selectedMeasurement = measurements.find(
          measurement => measurement.id === selectionHit.measurementId
        );
        if (selectedMeasurement) {
          if (selectionHit.kind === 'point') {
            // 所有测量（包括医学测量）均支持直接点拖拽
            onDisplayMeasurementSelect(null);
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
          } else if (selectionHit.kind === 'effective-cfh') {
            const effectiveCfh = getPelvicMeasurementGeometry(
              selectedMeasurement.points
            )?.femoralHeadCenter;
            if (!effectiveCfh) return true;
            onDisplayMeasurementSelect(null);
            setSelectionState({
              measurementId: selectedMeasurement.id,
              pointIndex: null,
              type: 'effective-cfh',
              isDragging: false,
              dragOffset: {
                x: imagePoint.x - effectiveCfh.x,
                y: imagePoint.y - effectiveCfh.y,
              },
            });
          } else if (selectionHit.kind === 'line') {
            onDisplayMeasurementSelect(null);
            const anchor = selectedMeasurement.points[selectionHit.lineIndex];
            setSelectionState({
              measurementId: selectedMeasurement.id,
              pointIndex: selectionHit.lineIndex,
              type: 'line',
              isDragging: false,
              dragOffset: {
                x: imagePoint.x - anchor.x,
                y: 0,
              },
            });
          } else {
            // 点击测量体（非点区域）：整体拖拽
            onDisplayMeasurementSelect(null);
            const center = getMeasurementDragCenter(selectedMeasurement);
            setSelectionState({
              measurementId: selectedMeasurement.id,
              pointIndex: null,
              type: 'whole',
              isDragging: false,
              dragOffset: {
                x: imagePoint.x - center.x,
                y: imagePoint.y - center.y,
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
        radius: input.policy.pointHitRadius,
      });
      if (workingPointIndex !== null) {
        onDisplayMeasurementSelect(null);
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
              minX:
                imageToScreen(selectedPoint).x - input.policy.selectionPadding,
              maxX:
                imageToScreen(selectedPoint).x + input.policy.selectionPadding,
              minY:
                imageToScreen(selectedPoint).y - input.policy.selectionPadding,
              maxY:
                imageToScreen(selectedPoint).y + input.policy.selectionPadding,
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

          if (selectionState.type === 'effective-cfh') {
            const effectiveCfh = getPelvicMeasurementGeometry(
              measurement.points
            )?.femoralHeadCenter;
            if (effectiveCfh) {
              const effectiveCfhScreen = imageToScreen(effectiveCfh);
              const pointBox = {
                minX: effectiveCfhScreen.x - input.policy.selectionPadding,
                maxX: effectiveCfhScreen.x + input.policy.selectionPadding,
                minY: effectiveCfhScreen.y - input.policy.selectionPadding,
                maxY: effectiveCfhScreen.y + input.policy.selectionPadding,
              };
              if (isPointInSelectionBox(screenPoint, pointBox)) {
                setSelectionState(previous => ({
                  ...previous,
                  dragOffset: {
                    x: imagePoint.x - effectiveCfh.x,
                    y: imagePoint.y - effectiveCfh.y,
                  },
                }));
                return true;
              }
            }
          }

          if (selectionState.type === 'whole') {
            const box = getMeasurementSelectionBoxInScreen(
              measurement,
              imageToScreen
            );
            if (isPointInSelectionBox(screenPoint, box)) {
              const center = getMeasurementDragCenter(measurement);
              setSelectionState(previous => ({
                ...previous,
                dragOffset: {
                  x: imagePoint.x - center.x,
                  y: imagePoint.y - center.y,
                },
              }));
              return true;
            }
          }
        }
      }

      beginViewportInteraction(x, y);
      return true;
    },
    [
      clickedPoints,
      canvasDrag,
      getTransformContext,
      beginViewportInteraction,
      hideAllAnnotations,
      hiddenAnnotationIds,
      imageScale,
      imageToScreen,
      measurements,
      onDisplayMeasurementSelect,
      screenToImage,
      selectionState.measurementId,
      selectionState.pointIndex,
      selectionState.type,
      setSelectionState,
    ]
  );

  const beginDrawingToolInteraction = useCallback(
    (x: number, y: number) => drawingTool.beginInteraction(x, y),
    [drawingTool]
  );

  const handleHandModeHover = useCallback(
    (x: number, y: number, input: CanvasPointerInput) => {
      if (
        selectedTool !== 'hand' ||
        selectionState.isDragging ||
        isDragging ||
        drawingState.isDrawing
      ) {
        setHoverState({
          measurementId: null,
          keypointId: null,
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
        pointRadius: input.policy.pointHitRadius,
        lineRadius: input.policy.lineHitRadius,
      });

      if (hoverHit.kind === 'point') {
        setHoverState({
          measurementId: hoverHit.measurementId,
          keypointId: null,
          pointIndex: hoverHit.pointIndex,
          elementType: 'point',
        });
        return;
      }

      if (hoverHit.kind === 'effective-cfh') {
        setHoverState({
          measurementId: hoverHit.measurementId,
          keypointId: null,
          pointIndex: null,
          elementType: 'effective-cfh',
        });
        return;
      }

      if (
        hoverHit.kind === 'line' ||
        hoverHit.kind === 'whole' ||
        hoverHit.kind === 'label'
      ) {
        setHoverState({
          measurementId: hoverHit.measurementId,
          keypointId: null,
          pointIndex: null,
          elementType: 'whole',
        });
        return;
      }

      const hoveredWorkingPointIndex = hitTestWorkingPoint({
        points: clickedPoints,
        screenPoint,
        imageToScreen,
        radius: input.policy.pointHitRadius,
      });
      setHoverState({
        measurementId: null,
        keypointId: null,
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

  const beginPointerInteraction = useCallback(
    (input: CanvasPointerInput) => {
      if (!input.primaryActionPressed) return;
      onCanvasClick();
      if (!imageNaturalSize) {
        return;
      }

      const { x, y } = input.screenPoint;

      if (isManualBindingMode) {
        handleManualBindingPointerDown(x, y, input.policy.pointHitRadius);
        return;
      }

      if (
        standardDistanceInteraction.beginInteraction(
          x,
          y,
          input.policy.pointHitRadius
        )
      ) {
        return;
      }

      setDragStartPos(input.clientPoint);

      if (selectedTool === 'hand') {
        beginHandModeInteraction(x, y, input);
        return;
      }

      beginDrawingToolInteraction(x, y);
    },
    [
      beginDrawingToolInteraction,
      beginHandModeInteraction,
      handleManualBindingPointerDown,
      imageNaturalSize,
      isManualBindingMode,
      onCanvasClick,
      selectedTool,
      setDragStartPos,
      standardDistanceInteraction,
    ]
  );

  const updatePointerInteraction = useCallback(
    (input: CanvasPointerInput) => {
      if (!imageNaturalSize) {
        return;
      }

      const { x, y } = input.screenPoint;
      if (input.policy.supportsHover || input.primaryActionPressed) {
        setLivePointerImagePoint(screenToImage(x, y));
      }

      if (
        standardDistanceInteraction.updateInteraction(
          x,
          y,
          input.primaryActionPressed,
          input.policy.supportsHover,
          input.policy.pointHitRadius,
          input.policy.dragStartThreshold
        )
      ) {
        return;
      }

      drawingTool.updateInteraction(x, y);

      if (
        canvasDrag.updateInteraction(
          x,
          y,
          input.primaryActionPressed,
          input.policy.dragStartThreshold
        )
      ) {
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
      } else if (adjustMode === 'brightness' && input.primaryActionPressed) {
        const deltaX = input.clientPoint.x - dragStartPos.x;
        const deltaY = input.clientPoint.y - dragStartPos.y;
        setContrast(previous =>
          Math.max(-100, Math.min(100, previous + deltaX * 0.5))
        );
        setBrightness(previous =>
          Math.max(-100, Math.min(100, previous - deltaY * 0.5))
        );
        setDragStartPos(input.clientPoint);
      }

      if (input.policy.supportsHover) {
        handleHandModeHover(x, y, input);
      }
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
      setLivePointerImagePoint,
      standardDistanceInteraction,
    ]
  );

  const endPointerInteraction = useCallback(() => {
    standardDistanceInteraction.endInteraction();
    canvasDrag.endDragSelection();
    drawingTool.endInteraction();
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
    beginPointerInteraction,
    updatePointerInteraction,
    endPointerInteraction,
    clearHover: () =>
      setHoverState({
        measurementId: null,
        keypointId: null,
        pointIndex: null,
        elementType: null,
      }),
  };
}
