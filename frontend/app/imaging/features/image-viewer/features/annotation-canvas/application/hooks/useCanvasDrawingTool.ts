import { useCallback } from 'react';
import {
  assembleInheritedMeasurementPoints,
  getManualMeasurementInheritedPointMap,
  planManualMeasurementPointClick,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import { hasUniqueAnnotationForTool } from '@xiehe/imaging-core/measurements';
import { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import { Tool } from '@/app/imaging/features/image-viewer/shared/types';
import type { KeypointAnnotation } from '@xiehe/imaging-core/keypoints';
import type {
  LateralCobbPlacementSession,
  PelvicPlacementSession,
} from '@xiehe/imaging-core/measurements/lateral';
import {
  getNextPelvicPlacementPointIndex,
  getPelvicPlacementInheritedPointMap,
  getLateralCobbPlacementInheritedPointMap,
  getNextLateralCobbPlacementPointIndex,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import { getPelvicToolPointCount } from '@xiehe/imaging-core/measurements/lateral';
import { assembleLateralCobbPlacementPoints } from '@xiehe/imaging-core/measurements/lateral';
import { DrawingState, ReferenceLines } from '@xiehe/imaging-core/canvas';
import { type AvtPlacementSession } from '@xiehe/imaging-core/contracts';
import { createHorizontalDiscAnchors } from '@xiehe/imaging-core/measurements/ap';
import {
  isDynamicShapeTool,
  planDynamicShapeCompletion,
  planSpecialPointToolClick,
  removeClickedPointNear,
} from '@xiehe/imaging-core/canvas';
import { getPelvicMeasurementKeypointBindingRule } from '@xiehe/imaging-core/measurement-keypoint-sync';

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
  cobbPlacementSession?: LateralCobbPlacementSession | null;
  onAvtDiscPlacementComplete?: (anchors: readonly [Point, Point]) => void;
  onCobbPlacementComplete?: (
    points: Point[],
    session: LateralCobbPlacementSession
  ) => void;
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
  cobbPlacementSession,
  onAvtDiscPlacementComplete,
  onCobbPlacementComplete,
  drawingState,
  setDrawingState,
  setReferenceLines,
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

  const beginDynamicShape = useCallback(
    (x: number, y: number) => {
      if (!isDynamicShapeTool(selectedTool)) return false;

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
      const plan = planSpecialPointToolClick({
        toolId: selectedTool,
        clickedPoints,
        point: imagePoint,
        imageScale,
      });
      if (!plan.handled) return false;
      setClickedPoints(plan.clickedPoints);
      if (plan.completion) {
        addMeasurement(plan.completion.type, plan.completion.points);
      }
      return true;
    },
    [
      addMeasurement,
      clickedPoints,
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

      const pointsAfterRemoval = removeClickedPointNear(
        clickedPoints,
        imagePoint,
        5 / imageScale
      );
      if (pointsAfterRemoval) {
        setClickedPoints(pointsAfterRemoval);
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
            assembleInheritedMeasurementPoints(pointsNeeded, inheritedMap, [])
          );
          setClickedPoints([]);
          return true;
        }

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === pointsNeeded - inheritedMap.size) {
          addMeasurement(
            currentTool.id,
            assembleInheritedMeasurementPoints(
              pointsNeeded,
              inheritedMap,
              newPoints
            )
          );
          setClickedPoints([]);
        }
        return true;
      }

      if (
        cobbPlacementSession &&
        cobbPlacementSession.toolId === selectedTool
      ) {
        const inherited = getLateralCobbPlacementInheritedPointMap({
          session: cobbPlacementSession,
          keypoints,
        });
        const nextPointIndex = getNextLateralCobbPlacementPointIndex(
          inherited,
          clickedPoints.length
        );
        if (nextPointIndex === null) {
          const points = assembleLateralCobbPlacementPoints(inherited, []);
          if (points) onCobbPlacementComplete?.(points, cobbPlacementSession);
          setClickedPoints([]);
          onMeasurementComplete?.();
          return true;
        }

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        const points = assembleLateralCobbPlacementPoints(inherited, newPoints);
        if (points) {
          onCobbPlacementComplete?.(points, cobbPlacementSession);
          setClickedPoints([]);
          onMeasurementComplete?.();
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
      const plan = planManualMeasurementPointClick({
        toolId: currentTool.id,
        pointsNeeded: measurementPointsNeeded,
        inheritedPoints: inheritedMap,
        clickedPoints,
        rawPoint: imagePoint,
      });
      setClickedPoints(plan.clickedPoints);
      if (plan.referenceLineUpdate) {
        const { key, point } = plan.referenceLineUpdate;
        setReferenceLines(previous => ({ ...previous, [key]: point }));
      }
      if (plan.completedPoints) {
        addMeasurement(currentTool.id, plan.completedPoints);
      }
      return true;
    },
    [
      addMeasurement,
      avtPlacementSession,
      cobbPlacementSession,
      clickedPoints,
      getCurrentTool,
      imageScale,
      keypoints,
      measurements,
      onAvtDiscPlacementComplete,
      onCobbPlacementComplete,
      onMeasurementComplete,
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
      const completion = planDynamicShapeCompletion(
        selectedTool,
        startPoint,
        currentPoint
      );
      if (completion) {
        addMeasurement(completion.type, completion.points);
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
