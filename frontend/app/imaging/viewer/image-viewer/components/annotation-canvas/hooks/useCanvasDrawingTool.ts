import { useCallback } from 'react';
import {
  POINT_INHERITANCE_RULES,
  SHARED_ANATOMICAL_POINT_GROUPS,
  getInheritedPoints,
} from '../../../domain/annotation-inheritance';
import { Point, Tool } from '../../../types';
import { DrawingState, ReferenceLines } from '../types';

interface UseCanvasDrawingToolOptions {
  selectedTool: string;
  tools: Tool[];
  measurements: { type: string; points: Point[] }[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  imageScale: number;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  drawingState: DrawingState;
  setDrawingState: React.Dispatch<React.SetStateAction<DrawingState>>;
  setReferenceLines: React.Dispatch<React.SetStateAction<ReferenceLines>>;
  constrainAuxLinePoint: (toolId: string, anchor: Point, rawPoint: Point) => Point;
  screenToImage: (screenX: number, screenY: number) => Point;
}

function buildInheritedMap(
  toolId: string,
  toolName: string,
  measurements: { type: string; points: Point[] }[]
) {
  const inheritedMap = new Map<number, Point>();
  const asymRules = POINT_INHERITANCE_RULES[toolId] || [];

  for (const rule of asymRules) {
    const source = measurements.find(measurement => measurement.type === rule.fromType);
    if (!source) continue;

    for (let index = 0; index < rule.sourcePointIndices.length; index += 1) {
      const sourceIndex = rule.sourcePointIndices[index];
      const destinationIndex = rule.destinationPointIndices[index];
      if (sourceIndex < source.points.length) {
        inheritedMap.set(destinationIndex, source.points[sourceIndex]);
      }
    }
  }

  for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
    const ownParticipant = group.participants.find(
      participant => participant.toolId === toolId || participant.typeName === toolName
    );
    if (!ownParticipant || inheritedMap.has(ownParticipant.pointIndex)) {
      continue;
    }

    for (const participant of group.participants) {
      if (
        participant.toolId === toolId ||
        participant.typeName === toolName
      ) {
        continue;
      }
      const source = measurements.find(
        measurement => measurement.type === participant.typeName
      );
      if (source && participant.pointIndex < source.points.length) {
        inheritedMap.set(
          ownParticipant.pointIndex,
          source.points[participant.pointIndex]
        );
        break;
      }
    }
  }

  return inheritedMap;
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
 * 负责 clickedPoints 累积、继承点补齐、reference line 维护，以及动态图形 mouse up 完成。
 */
export function useCanvasDrawingTool({
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
}: UseCanvasDrawingToolOptions) {
  const getCurrentTool = useCallback(
    () => tools.find(tool => tool.id === selectedTool),
    [selectedTool, tools]
  );

  const completePolygon = useCallback(() => {
    if (clickedPoints.length >= 3) {
      onMeasurementAdd('多边形标注', clickedPoints);
      setClickedPoints([]);
    }
  }, [clickedPoints, onMeasurementAdd, setClickedPoints]);

  const handleDynamicShapeMouseDown = useCallback(
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

  const handleSpecialPointToolMouseDown = useCallback(
    (x: number, y: number) => {
      const imagePoint = screenToImage(x, y);

      if (selectedTool === 'polygon') {
        if (clickedPoints.length >= 3) {
          const firstPoint = clickedPoints[0];
          const distance = Math.hypot(
            imagePoint.x - firstPoint.x,
            imagePoint.y - firstPoint.y
          );
          if (distance < 10 / imageScale) {
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
          onMeasurementAdd('锥体中心', newPoints);
          setClickedPoints([]);
        }
        return true;
      }

      if (selectedTool === 'aux-length') {
        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === 2) {
          onMeasurementAdd('距离标注', newPoints);
          setClickedPoints([]);
        }
        return true;
      }

      if (selectedTool === 'aux-angle') {
        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
        if (newPoints.length === 4) {
          onMeasurementAdd('角度标注', newPoints);
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
            onMeasurementAdd(currentTool.name, newPoints);
            setClickedPoints([]);
          }
        }
        return true;
      }

      return false;
    },
    [
      clickedPoints,
      completePolygon,
      constrainAuxLinePoint,
      getCurrentTool,
      imageScale,
      onMeasurementAdd,
      screenToImage,
      selectedTool,
      setClickedPoints,
    ]
  );

  const handleMeasurementToolMouseDown = useCallback(
    (x: number, y: number) => {
      const imagePoint = screenToImage(x, y);
      const currentTool = getCurrentTool();
      if (!currentTool) {
        return false;
      }

      let clickedExistingPoint = false;
      for (let index = 0; index < clickedPoints.length; index += 1) {
        const point = clickedPoints[index];
        const distance = Math.hypot(imagePoint.x - point.x, imagePoint.y - point.y);
        if (distance < 5 / imageScale) {
          setClickedPoints(clickedPoints.filter((_, pointIndex) => pointIndex !== index));
          clickedExistingPoint = true;
          break;
        }
      }

      if (clickedExistingPoint) {
        return true;
      }

      let finalPoint = imagePoint;
      if (selectedTool.includes('ts') && clickedPoints.length === 1) {
        finalPoint = { x: imagePoint.x, y: clickedPoints[0].y };
      }

      const newPoints = [...clickedPoints, finalPoint];
      setClickedPoints(newPoints);

      if (selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')) {
        if (newPoints.length === 1) {
          setReferenceLines(previous => ({ ...previous, t1Tilt: imagePoint }));
        } else if (newPoints.length === 2) {
          onMeasurementAdd(currentTool.name, newPoints);
          setClickedPoints([]);
          setReferenceLines(previous => ({ ...previous, t1Tilt: null }));
        }
        return true;
      }

      if (
        selectedTool.includes('ca') ||
        selectedTool.includes('pelvic') ||
        selectedTool.includes('sacral')
      ) {
        const referenceKey = selectedTool.includes('ca')
          ? 'ca'
          : selectedTool.includes('pelvic')
            ? 'pelvic'
            : 'sacral';

        if (newPoints.length === 1) {
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: imagePoint,
          }));
        } else if (newPoints.length === 2) {
          onMeasurementAdd(currentTool.name, newPoints);
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
        selectedTool.includes('ts')
      ) {
        const inheritedMap = buildInheritedMap(
          currentTool.id,
          currentTool.name,
          measurements
        );
        const effectiveNeeded = currentTool.pointsNeeded - inheritedMap.size;

        if (newPoints.length === 1) {
          const referenceKey = selectedTool.includes('ss')
            ? 'ss'
            : selectedTool.includes('sva')
              ? 'sva'
              : 'ts';
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: imagePoint,
          }));
        }

        if (newPoints.length === effectiveNeeded) {
          const allPoints = assembleInheritedPoints(
            currentTool.pointsNeeded,
            inheritedMap,
            newPoints
          );
          onMeasurementAdd(currentTool.name, allPoints);
          setClickedPoints([]);
          if (selectedTool.includes('ss')) {
            setReferenceLines(previous => ({ ...previous, ss: null }));
          } else if (selectedTool.includes('sva')) {
            setReferenceLines(previous => ({ ...previous, sva: null }));
          } else {
            setReferenceLines(previous => ({ ...previous, ts: null }));
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
          onMeasurementAdd(currentTool.name, newPoints);
          setClickedPoints([]);
          setReferenceLines(previous => ({
            ...previous,
            [referenceKey]: null,
          }));
        }
        return true;
      }

      if (selectedTool.includes('c7-offset')) {
        const { points: inheritedPoints, count: inheritedCount } =
          getInheritedPoints('c7-offset', measurements);
        const effectiveNeeded = 6 - inheritedCount;
        if (newPoints.length === effectiveNeeded) {
          onMeasurementAdd(currentTool.name, [...newPoints, ...inheritedPoints]);
          setClickedPoints([]);
        }
        return true;
      }

      const inheritedMap = buildInheritedMap(
        currentTool.id,
        currentTool.name,
        measurements
      );
      const effectiveNeeded = currentTool.pointsNeeded - inheritedMap.size;
      if (newPoints.length === effectiveNeeded) {
        const allPoints = assembleInheritedPoints(
          currentTool.pointsNeeded,
          inheritedMap,
          newPoints
        );
        onMeasurementAdd(currentTool.name, allPoints);
        setClickedPoints([]);
      }
      return true;
    },
    [
      clickedPoints,
      getCurrentTool,
      imageScale,
      measurements,
      onMeasurementAdd,
      screenToImage,
      selectedTool,
      setClickedPoints,
      setReferenceLines,
    ]
  );

  const handleMouseDown = useCallback(
    (x: number, y: number) => {
      if (handleDynamicShapeMouseDown(x, y)) {
        return true;
      }

      if (handleSpecialPointToolMouseDown(x, y)) {
        return true;
      }

      return handleMeasurementToolMouseDown(x, y);
    },
    [handleDynamicShapeMouseDown, handleMeasurementToolMouseDown, handleSpecialPointToolMouseDown]
  );

  const handleMouseMove = useCallback(
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

  const handleMouseUp = useCallback(() => {
    if (
      drawingState.isDrawing &&
      drawingState.startPoint &&
      drawingState.currentPoint
    ) {
      const { startPoint, currentPoint } = drawingState;
      if (selectedTool === 'circle') {
        onMeasurementAdd('圆形标注', [startPoint, currentPoint]);
      } else if (selectedTool === 'ellipse') {
        onMeasurementAdd('椭圆标注', [startPoint, currentPoint]);
      } else if (selectedTool === 'rectangle') {
        onMeasurementAdd('矩形标注', [
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
        onMeasurementAdd('箭头标注', [startPoint, currentPoint]);
      }
    }

    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
  }, [drawingState, onMeasurementAdd, selectedTool, setDrawingState]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
