import { calculateDistance } from '../../../shared/geometry';
import { INTERACTION_CONSTANTS } from '../../../shared/constants';
import { Point } from '../../../types';

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
}: UseStandardDistanceInteractionOptions) {
  const beginDragIfHit = (x: number, y: number) => {
    if (standardDistancePoints.length !== 2) return false;

    const clickRadius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS;
    for (let index = 0; index < standardDistancePoints.length; index += 1) {
      const pointScreen = imageToScreen(standardDistancePoints[index]);
      const distance = calculateDistance({ x, y }, pointScreen);
      if (distance < clickRadius) {
        setDraggingStandardPointIndex(index);
        return true;
      }
    }
    return false;
  };

  const handleMouseDown = (x: number, y: number, button: number) => {
    if (button !== 0) return false;

    if (isSettingStandardDistance) {
      if (beginDragIfHit(x, y)) {
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

    if (selectedTool === 'hand' && beginDragIfHit(x, y)) {
      return true;
    }

    return false;
  };

  const handleMouseMove = (x: number, y: number, buttons: number) => {
    if (draggingStandardPointIndex !== null && buttons === 1) {
      const imagePoint = screenToImage(x, y);
      const newPoints = [...standardDistancePoints];
      newPoints[draggingStandardPointIndex] = imagePoint;
      setStandardDistancePoints(newPoints);

      if (standardDistance !== null && newPoints.length === 2) {
        recalculateAVTandTS(standardDistance, newPoints);
      }
      return true;
    }

    if (standardDistancePoints.length > 0) {
      const hoverRadius = INTERACTION_CONSTANTS.HOVER_RADIUS;
      let foundHover = false;

      for (let index = 0; index < standardDistancePoints.length; index += 1) {
        const pointScreen = imageToScreen(standardDistancePoints[index]);
        const distance = calculateDistance({ x, y }, pointScreen);

        if (distance < hoverRadius) {
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

  const handleMouseUp = () => {
    if (draggingStandardPointIndex !== null) {
      setDraggingStandardPointIndex(null);
    }
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
