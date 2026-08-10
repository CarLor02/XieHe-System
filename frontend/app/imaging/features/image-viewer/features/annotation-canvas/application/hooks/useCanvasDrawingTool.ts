import { useCallback } from 'react';
import {
  getManualMeasurementInheritedPointMap,
  resolveNextManualMeasurementPoint,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import { hasUniqueAnnotationForTool } from '@xiehe/imaging-core/measurements';
import {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';
import {
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { KeypointAnnotation } from '@xiehe/imaging-core/keypoints';
import type { PelvicPlacementSession } from '@xiehe/imaging-core/measurements/lateral';
import {
  getNextPelvicPlacementPointIndex,
  getPelvicPlacementInheritedPointMap,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import { getPelvicToolPointCount } from '@xiehe/imaging-core/measurements/lateral';
import {
  DrawingState,
  ReferenceLines,
} from '@xiehe/imaging-core/canvas';
import {
  createHemipelvicWidthRatioPoints,
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
} from '@xiehe/imaging-core/measurements/ap';
import {
  type AvtPlacementSession,
} from '@xiehe/imaging-core/contracts';
import {
  createHorizontalDiscAnchors,
} from '@xiehe/imaging-core/measurements/ap';
import {
  circleGeometryToPoints,
  createCircleGeometry,
} from '@xiehe/imaging-core/geometry';
import { getPelvicMeasurementKeypointBindingRule } from '@xiehe/imaging-core/measurement-keypoint-sync';

const POLYGON_CLOSE_TOLERANCE_PX = 18;

interface UseCanvasDrawingToolOptions {
  selectedTool: string;
  tools: Tool[];
  measurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  imageScale: number;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  /** 测量放置完成后回调，用于自动切换工具（如切回 hand 模式） */
  onMeasurementComplete?: () => void;
  avtPlacementSession?: AvtPlacementSession | null;
  pelvicPlacementSession?: PelvicPlacementSession | null;
  onAvtDiscPlacementComplete?: (anchors: readonly [Point, Point]) => void;
  drawingState: DrawingState;
  setDrawingState: React.Dispatch<React.SetStateAction<DrawingState>>;
  setReferenceLines: React.Dispatch<React.SetStateAction<ReferenceLines>>;
  constrainAuxLinePoint: (
    toolId: string,
    anchor: Point,
    rawPoint: Point
  ) => Point;
  screenToImage: (screenX: number, screenY: number) => Point;
}

function assembleInheritedPoints(
  pointsNeeded: number,
  inheritedMap: Map<number, Point>,
  clickedPoints: Point[]
) {
  const allPoints: Point[] = [];
  let userPointIndex = 0;

  for (let index = 0; index < pointsNeeded; index += 1) {
    if (inheritedMap.has(index)) {
      allPoints[index] = inheritedMap.get(index)!;
    } else {
      allPoints[index] = clickedPoints[userPointIndex++];
    }
  }

  return allPoints;
}

/**
 * 绘制工具点击状态机。
 * 负责 clickedPoints 累积、继承点补齐、reference line 维护，以及动态图形 pointer up 完成。
 */
export function useCanvasDrawingTool({
  selectedTool,
  tools,
  measurements,
  keypoints,
  clickedPoints,
  setClickedPoints,
  imageScale,
  onMeasurementAdd,
  onMeasurementComplete,
  avtPlacementSession,
  pelvicPlacementSession,
  onAvtDiscPlacementComplete,
  drawingState,
  setDrawingState,
  setReferenceLines,
  constrainAuxLinePoint,
  screenToImage,
}: UseCanvasDrawingToolOptions) {
  const getCurrentTool = useCallback(
    () => tools.find(tool => tool.id === selectedTool),
    [selectedTool, tools]
  );

  /** 放置测量 + 切回 hand 模式 */
  const addMeasurement = useCallback(
    (type: string, points: Point[]) => {
      onMeasurementAdd(type, points);
      onMeasurementComplete?.();
    },
    [onMeasurementAdd, onMeasurementComplete]
  );

  const completePolygon = useCallback(() => {
    if (clickedPoints.length >= 3) {
      addMeasurement('polygon', clickedPoints);
      setClickedPoints([]);
    }
  }, [clickedPoints, addMeasurement, setClickedPoints]);

  const beginDynamicShape = useCallback(
    (x: number, y: number) => {
      if (
        selectedTool !== 'circle' &&
        selectedTool !== 'ellipse' &&
        selectedTool !== 'rectangle' &&
        selectedTool !== 'arrow'
      ) {
        return false;
      }

      const imagePoint = screenToImage(x, y);
      setDrawingState({
        isDrawing: true,
        startPoint: imagePoint,
        currentPoint: imagePoint,
      });
      return true;
    },
    [screenToImage, selectedTool, setDrawingState]
  );

  const beginSpecialPointTool = useCallback(
    (x: number, y: number) => {
      const imagePoint = screenToImage(x, y);

      if (selectedTool === 'polygon') {
        if (clickedPoints.length >= 3) {
          const firstPoint = clickedPoints[0];
          const distance = Math.hypot(
            imagePoint.x - firstPoint.x,
            imagePoint.y - firstPoint.y
          );
          if (distance <= POLYGON_CLOSE_TOLERANCE_PX / imageScale) {
            completePolygon();
            return true;
          }
        }

        setClickedPoints([...clickedPoints, imagePoint]);
        return true;
      }

      if (selectedTool === 'vertebra-center') {
        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === 4) {
          addMeasurement('vertebra-center', newPoints);
          setClickedPoints([]);
        }
        return true;
      }

      if (selectedTool === 'aux-length') {
        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === 2) {
          addMeasurement('aux-length', newPoints);
          setClickedPoints([]);
        }
        return true;
      }

      if (selectedTool === 'aux-angle') {
        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === 4) {
          addMeasurement('aux-angle', newPoints);
          setClickedPoints([]);
        }
        return true;
      }

      if (
        selectedTool === 'aux-horizontal-line' ||
        selectedTool === 'aux-vertical-line'
      ) {
        const nextPoint =
          clickedPoints.length === 1
            ? constrainAuxLinePoint(selectedTool, clickedPoints[0], imagePoint)
            : imagePoint;
        const newPoints = [...clickedPoints, nextPoint];
        setClickedPoints(newPoints);
        if (newPoints.length === 2) {
          const currentTool = getCurrentTool();
          if (currentTool) {
            addMeasurement(currentTool.id, newPoints);
            setClickedPoints([]);
          }
        }
        return true;
      }

      return false;
    },
    [
      addMeasurement,
      clickedPoints,
      completePolygon,
      constrainAuxLinePoint,
      getCurrentTool,
      imageScale,
      screenToImage,
      selectedTool,
      setClickedPoints,
    ]
  );

  const beginMeasurementTool = useCallback(
    (x: number, y: number) => {
      const imagePoint = screenToImage(x, y);
      const currentTool = getCurrentTool();
      if (!currentTool) {
        return false;
      }

      if (hasUniqueAnnotationForTool(measurements, currentTool)) {
        setClickedPoints([]);
        return true;
      }

      let clickedExistingPoint = false;
      for (let index = 0; index < clickedPoints.length; index += 1) {
        const point = clickedPoints[index];
        const distance = Math.hypot(
          imagePoint.x - point.x,
          imagePoint.y - point.y
        );
        if (distance < 5 / imageScale) {
          setClickedPoints(
            clickedPoints.filter((_, pointIndex) => pointIndex !== index)
          );
          clickedExistingPoint = true;
          break;
        }
      }

      if (clickedExistingPoint) {
        return true;
      }

      if (selectedTool === 'avt' && avtPlacementSession?.step.kind === 'disc') {
        if (clickedPoints.length === 0) {
          setClickedPoints([imagePoint]);
          return true;
        }

        const anchors = createHorizontalDiscAnchors(
          clickedPoints[0],
          imagePoint
        );
        onAvtDiscPlacementComplete?.(anchors);
        setClickedPoints([]);
        return true;
      }

      if (
        pelvicPlacementSession &&
        pelvicPlacementSession.toolId === selectedTool
      ) {
        const inheritedMap = getPelvicPlacementInheritedPointMap({
          toolId: pelvicPlacementSession.toolId,
          mode: pelvicPlacementSession.mode,
          keypoints,
          measurements,
        });
        const pointsNeeded = getPelvicToolPointCount(
          pelvicPlacementSession.toolId,
          pelvicPlacementSession.mode
        );
        const nextPointIndex = getNextPelvicPlacementPointIndex(
          pelvicPlacementSession.toolId,
          pelvicPlacementSession.mode,
          inheritedMap,
          clickedPoints.length
        );
        if (nextPointIndex === null) {
          addMeasurement(
            currentTool.id,
            assembleInheritedPoints(pointsNeeded, inheritedMap, [])
          );
          setClickedPoints([]);
          return true;
        }

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === pointsNeeded - inheritedMap.size) {
          addMeasurement(
            currentTool.id,
            assembleInheritedPoints(pointsNeeded, inheritedMap, newPoints)
          );
          setClickedPoints([]);
        }
        return true;
      }

      const hasFh1 = keypoints.some(keypoint => keypoint.id === 'FH-1');
      const hasFh2 = keypoints.some(keypoint => keypoint.id === 'FH-2');
      if (selectedTool === 'tpa' && hasFh1 !== hasFh2) {
        setClickedPoints([]);
        return true;
      }
      const tpaMode =
        selectedTool === 'tpa' && hasFh1 && hasFh2 ? 'bilateral' : 'single';
      const tpaBindingRule =
        selectedTool === 'tpa'
          ? getPelvicMeasurementKeypointBindingRule({
              id: 'manual-tpa-binding-probe',
              type: 'tpa',
              value: '',
              points: [],
              pelvicMetadata: {
                schemaVersion: 2,
                femoralHeadMode: tpaMode,
              },
            })
          : null;
      const measurementPointsNeeded = currentTool.pointsNeeded;
      const inheritedMap = tpaBindingRule
        ? tpaBindingRule.getAvailableMeasurementPointMap(
            new Map(keypoints.map(keypoint => [keypoint.id, keypoint]))
          )
        : getManualMeasurementInheritedPointMap(
            currentTool.id,
            measurementPointsNeeded,
            keypoints
          );
      const effectiveNeeded = measurementPointsNeeded - inheritedMap.size;
      if (effectiveNeeded === 0) {
        addMeasurement(
          currentTool.id,
          assembleInheritedPoints(measurementPointsNeeded, inheritedMap, [])
        );
        setClickedPoints([]);
        return true;
      }

      const resolvedPoint = resolveNextManualMeasurementPoint({
        toolId: currentTool.id,
        pointsNeeded: measurementPointsNeeded,
        inheritedPoints: inheritedMap,
        clickedPoints,
        rawPoint: imagePoint,
      });
      const finalPoint = resolvedPoint?.point ?? imagePoint;

      const newPoints = [...clickedPoints, finalPoint];
      setClickedPoints(newPoints);

      if (selectedTool === HEMIPELVIC_WIDTH_RATIO_TOOL_ID) {
        if (newPoints.length === effectiveNeeded) {
          const anchors = assembleInheritedPoints(
            measurementPointsNeeded,
            inheritedMap,
            newPoints
          );
          addMeasurement(
            currentTool.id,
            createHemipelvicWidthRatioPoints(anchors)
          );
          setClickedPoints([]);
        }
        return true;
      }

      if (
        selectedTool.includes('t1-tilt') ||
        selectedTool.includes('t1-slope')
      ) {
        if (newPoints.length === 1 && effectiveNeeded > 1) {
          setReferenceLines(previous => ({ ...previous, t1Tilt: imagePoint }));
        }
        if (newPoints.length === effectiveNeeded) {
          addMeasurement(
            currentTool.id,
            assembleInheritedPoints(
              measurementPointsNeeded,
              inheritedMap,
              newPoints
            )
          );
          setClickedPoints([]);
          setReferenceLines(previous => ({ ...previous, t1Tilt: null }));
        }
        return true;
      }

      if (
        selectedTool.includes('ca') ||
        selectedTool === 'po' ||
        selectedTool === 'css'
      ) {
        const referenceKey = selectedTool.includes('ca')
          ? 'ca'
          : selectedTool === 'po'
            ? 'po'
            : 'css';

        if (newPoints.length === 1 && effectiveNeeded > 1) {
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: imagePoint,
          }));
        }
        if (newPoints.length === effectiveNeeded) {
          addMeasurement(
            currentTool.id,
            assembleInheritedPoints(
              measurementPointsNeeded,
              inheritedMap,
              newPoints
            )
          );
          setClickedPoints([]);
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: null,
          }));
        }
        return true;
      }

      if (
        selectedTool.includes('ss') ||
        selectedTool.includes('sva') ||
        selectedTool === 'ts'
      ) {
        if (newPoints.length === 1 && selectedTool !== 'ts') {
          const referenceKey = selectedTool.includes('ss')
            ? 'ss'
            : 'sva';
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: imagePoint,
          }));
        }

        if (newPoints.length === effectiveNeeded) {
          const allPoints = assembleInheritedPoints(
            measurementPointsNeeded,
            inheritedMap,
            newPoints
          );
          addMeasurement(currentTool.id, allPoints);
          setClickedPoints([]);
          if (selectedTool.includes('ss')) {
            setReferenceLines(previous => ({ ...previous, ss: null }));
          } else if (selectedTool.includes('sva')) {
            setReferenceLines(previous => ({ ...previous, sva: null }));
          }
        }
        return true;
      }

      if (selectedTool.includes('avt') || selectedTool.includes('lld')) {
        const referenceKey = selectedTool.includes('avt') ? 'avt' : 'lld';
        if (newPoints.length === 1) {
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: imagePoint,
          }));
        } else if (newPoints.length === 2) {
          addMeasurement(currentTool.id, newPoints);
          setClickedPoints([]);
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: null,
          }));
        }
        return true;
      }

      if (newPoints.length === effectiveNeeded) {
        const allPoints = assembleInheritedPoints(
          measurementPointsNeeded,
          inheritedMap,
          newPoints
        );
        addMeasurement(currentTool.id, allPoints);
        setClickedPoints([]);
      }
      return true;
    },
    [
      addMeasurement,
      avtPlacementSession,
      clickedPoints,
      getCurrentTool,
      imageScale,
      keypoints,
      measurements,
      onAvtDiscPlacementComplete,
      pelvicPlacementSession,
      screenToImage,
      selectedTool,
      setClickedPoints,
      setReferenceLines,
    ]
  );

  const beginInteraction = useCallback(
    (x: number, y: number) => {
      if (beginDynamicShape(x, y)) {
        return true;
      }

      if (beginSpecialPointTool(x, y)) {
        return true;
      }

      return beginMeasurementTool(x, y);
    },
    [beginDynamicShape, beginMeasurementTool, beginSpecialPointTool]
  );

  const updateInteraction = useCallback(
    (x: number, y: number) => {
      if (!drawingState.isDrawing) {
        return false;
      }

      const imagePoint = screenToImage(x, y);
      setDrawingState(previous => ({
        ...previous,
        currentPoint: imagePoint,
      }));
      return true;
    },
    [drawingState.isDrawing, screenToImage, setDrawingState]
  );

  const endInteraction = useCallback(() => {
    if (
      drawingState.isDrawing &&
      drawingState.startPoint &&
      drawingState.currentPoint
    ) {
      const { startPoint, currentPoint } = drawingState;
      if (selectedTool === 'circle') {
        addMeasurement(
          'circle',
          circleGeometryToPoints(createCircleGeometry(startPoint, currentPoint))
        );
      } else if (selectedTool === 'ellipse') {
        addMeasurement('ellipse', [startPoint, currentPoint]);
      } else if (selectedTool === 'rectangle') {
        addMeasurement('rectangle', [
          {
            x: Math.min(startPoint.x, currentPoint.x),
            y: Math.min(startPoint.y, currentPoint.y),
          },
          {
            x: Math.max(startPoint.x, currentPoint.x),
            y: Math.max(startPoint.y, currentPoint.y),
          },
        ]);
      } else if (selectedTool === 'arrow') {
        addMeasurement('arrow', [startPoint, currentPoint]);
      }
    }

    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
  }, [addMeasurement, drawingState, selectedTool, setDrawingState]);

  return {
    beginInteraction,
    updateInteraction,
    endInteraction,
  };
}
