import { useRef } from 'react';
import { calculateDistance2D as calculateDistance } from '@xiehe/imaging-core/geometry';
import { Point } from '@xiehe/imaging-core/contracts';

interface UseStandardDistanceInteractionOptions {
  isSettingStandardDistance: boolean;
  selectedTool: string;
  standardDistancePoints: Point[];
  setStandardDistancePoints: (points: Point[]) => void;
  setIsSettingStandardDistance: (value: boolean) => void;
  draggingStandardPointIndex: number | null;
  setDraggingStandardPointIndex: (index: number | null) => void;
  hoveredStandardPointIndex: number | null;
  setHoveredStandardPointIndex: (index: number | null) => void;
  standardDistance: number | null;
  recalculateAVTandTS: (distance?: number, points?: Point[]) => void;
  imageToScreen: (point: Point) => Point;
  screenToImage: (screenX: number, screenY: number) => Point;
  onAnnotationDragStart?: () => void;
}

/**
 * 标准距离交互。
 * 独立负责设置模式点击、hand 模式拖拽、hover 与重算联动。
 */
export function useStandardDistanceInteraction({
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
  onAnnotationDragStart,
}: UseStandardDistanceInteractionOptions) {
  const dragStartRef = useRef<{
    point: Point;
    historyStarted: boolean;
  } | null>(null);

  const beginDragIfHit = (x: number, y: number, pointHitRadius: number) => {
    if (standardDistancePoints.length !== 2) return false;

    for (let index = 0; index < standardDistancePoints.length; index += 1) {
      const pointScreen = imageToScreen(standardDistancePoints[index]);
      const distance = calculateDistance({ x, y }, pointScreen);
      if (distance < pointHitRadius) {
        dragStartRef.current = {
          point: { x, y },
          historyStarted: false,
        };
        setDraggingStandardPointIndex(index);
        return true;
      }
    }
    return false;
  };

  const beginInteraction = (x: number, y: number, pointHitRadius: number) => {
    if (isSettingStandardDistance) {
      if (beginDragIfHit(x, y, pointHitRadius)) {
        return true;
      }

      if (standardDistancePoints.length < 2) {
        const imagePoint = screenToImage(x, y);
        const newPoints = [...standardDistancePoints, imagePoint];
        setStandardDistancePoints(newPoints);

        if (newPoints.length === 2) {
          setIsSettingStandardDistance(false);
        }
      }
      return true;
    }

    if (selectedTool === 'hand' && beginDragIfHit(x, y, pointHitRadius)) {
      return true;
    }

    return false;
  };

  const updateInteraction = (
    x: number,
    y: number,
    primaryActionPressed: boolean,
    supportsHover: boolean,
    pointHitRadius: number,
    dragStartThreshold: number
  ) => {
    if (
      draggingStandardPointIndex !== null &&
      primaryActionPressed &&
      dragStartRef.current
    ) {
      if (!dragStartRef.current.historyStarted) {
        const distance = calculateDistance(dragStartRef.current.point, {
          x,
          y,
        });
        if (distance <= dragStartThreshold) {
          return true;
        }
        onAnnotationDragStart?.();
        dragStartRef.current.historyStarted = true;
      }

      const imagePoint = screenToImage(x, y);
      const newPoints = [...standardDistancePoints];
      newPoints[draggingStandardPointIndex] = imagePoint;
      setStandardDistancePoints(newPoints);

      if (standardDistance !== null && newPoints.length === 2) {
        recalculateAVTandTS(standardDistance, newPoints);
      }
      return true;
    }

    if (supportsHover && standardDistancePoints.length > 0) {
      let foundHover = false;

      for (let index = 0; index < standardDistancePoints.length; index += 1) {
        const pointScreen = imageToScreen(standardDistancePoints[index]);
        const distance = calculateDistance({ x, y }, pointScreen);

        if (distance < pointHitRadius) {
          setHoveredStandardPointIndex(index);
          foundHover = true;
          break;
        }
      }

      if (!foundHover && hoveredStandardPointIndex !== null) {
        setHoveredStandardPointIndex(null);
      }
    }

    return false;
  };

  const endInteraction = () => {
    dragStartRef.current = null;
    if (draggingStandardPointIndex !== null) {
      setDraggingStandardPointIndex(null);
    }
  };

  return {
    beginInteraction,
    updateInteraction,
    endInteraction,
  };
}
