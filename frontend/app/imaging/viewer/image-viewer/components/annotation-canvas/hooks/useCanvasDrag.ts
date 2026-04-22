import { applyPointBindings, AnnotationBindings } from '../../../domain/annotation-binding';
import { calculateMeasurementValue } from '../../../domain/annotation-calculation';
import { MeasurementData, Point } from '../../../types';
import { SelectionState } from '../types';

interface UseCanvasDragOptions {
  selectedTool: string;
  selectionState: SelectionState;
  setSelectionState: React.Dispatch<React.SetStateAction<SelectionState>>;
  measurements: MeasurementData[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  pointBindings: AnnotationBindings;
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageNaturalSize: { width: number; height: number } | null;
  imageScale: number;
  onMeasurementsUpdate: (measurements: MeasurementData[]) => void;
  imageToScreen: (point: Point) => Point;
  screenToImage: (screenX: number, screenY: number) => Point;
  referenceLines: {
    t1Tilt: Point | null;
  };
  setReferenceLines: React.Dispatch<
    React.SetStateAction<{
      t1Tilt: Point | null;
      ca: Point | null;
      pelvic: Point | null;
      sacral: Point | null;
      avt: Point | null;
      ts: Point | null;
      lld: Point | null;
      ss: Point | null;
      sva: Point | null;
      horizontalLine: Point | null;
      verticalLine: Point | null;
    }>
  >;
}

/**
 * 画布拖拽更新逻辑。
 * 负责单点拖拽、整体拖拽、绑定传播以及测量值重算。
 */
export function useCanvasDrag({
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
}: UseCanvasDragOptions) {
  const handleMouseMove = (x: number, y: number, buttons: number) => {
    if (
      !(selectionState.measurementId || selectionState.pointIndex !== null) ||
      selectedTool !== 'hand' ||
      buttons !== 1
    ) {
      return false;
    }

    const imagePoint = screenToImage(x, y);

    if (!selectionState.isDragging) {
      let canDrag = false;

      if (selectionState.measurementId) {
        const measurement = measurements.find(
          item => item.id === selectionState.measurementId
        );
        if (measurement && measurement.points.length > 0) {
          let minX: number;
          let maxX: number;
          let minY: number;
          let maxY: number;

          if (selectionState.type === 'whole') {
            if (measurement.type === '圆形标注' && measurement.points.length >= 2) {
              const center = measurement.points[0];
              const edge = measurement.points[1];
              const radius = Math.sqrt(
                Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
              );
              const screenCenter = imageToScreen(center);
              const screenRadius = radius * imageScale;
              minX = screenCenter.x - screenRadius - 15;
              maxX = screenCenter.x + screenRadius + 15;
              minY = screenCenter.y - screenRadius - 15;
              maxY = screenCenter.y + screenRadius + 15;
            } else if (
              measurement.type === '椭圆标注' &&
              measurement.points.length >= 2
            ) {
              const center = measurement.points[0];
              const edge = measurement.points[1];
              const radiusX = Math.abs(edge.x - center.x);
              const radiusY = Math.abs(edge.y - center.y);
              const screenCenter = imageToScreen(center);
              const screenRadiusX = radiusX * imageScale;
              const screenRadiusY = radiusY * imageScale;
              minX = screenCenter.x - screenRadiusX - 15;
              maxX = screenCenter.x + screenRadiusX + 15;
              minY = screenCenter.y - screenRadiusY - 15;
              maxY = screenCenter.y + screenRadiusY + 15;
            } else if (
              (measurement.type === '矩形标注' ||
                measurement.type === '箭头标注') &&
              measurement.points.length >= 2
            ) {
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);
              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else {
              const screenPoints = measurement.points.map(point =>
                imageToScreen(point)
              );
              const xs = screenPoints.map(point => point.x);
              const ys = screenPoints.map(point => point.y);
              minX = Math.min(...xs) - 15;
              maxX = Math.max(...xs) + 15;
              minY = Math.min(...ys) - 15;
              maxY = Math.max(...ys) + 15;
            }
          } else {
            const screenPoints = measurement.points.map(point =>
              imageToScreen(point)
            );
            const xs = screenPoints.map(point => point.x);
            const ys = screenPoints.map(point => point.y);
            minX = Math.min(...xs) - 15;
            maxX = Math.max(...xs) + 15;
            minY = Math.min(...ys) - 15;
            maxY = Math.max(...ys) + 15;
          }

          const mouseScreenPoint = imageToScreen(imagePoint);
          if (
            mouseScreenPoint.x >= minX &&
            mouseScreenPoint.x <= maxX &&
            mouseScreenPoint.y >= minY &&
            mouseScreenPoint.y <= maxY
          ) {
            canDrag = true;
          }
        }
      } else if (
        selectionState.pointIndex !== null &&
        clickedPoints[selectionState.pointIndex]
      ) {
        canDrag = true;
      }

      if (canDrag) {
        setSelectionState(previous => ({ ...previous, isDragging: true }));
      }
    }

    if (
      !selectionState.isDragging &&
      !selectionState.measurementId &&
      selectionState.pointIndex === null
    ) {
      return false;
    }

    if (selectionState.measurementId) {
      const measurement = measurements.find(
        item => item.id === selectionState.measurementId
      );
      if (!measurement || measurement.points.length === 0) {
        return false;
      }

      if (
        selectionState.type === 'point' &&
        selectionState.pointIndex !== null
      ) {
        let newPointX = imagePoint.x - selectionState.dragOffset.x;
        let newPointY = imagePoint.y - selectionState.dragOffset.y;

        if (measurement.type === '辅助水平线') {
          const otherIndex = selectionState.pointIndex === 0 ? 1 : 0;
          newPointY = measurement.points[otherIndex].y;
        }
        if (measurement.type === '辅助垂直线') {
          const otherIndex = selectionState.pointIndex === 0 ? 1 : 0;
          newPointX = measurement.points[otherIndex].x;
        }
        if (measurement.type === 'TTS') {
          // TTS 的点两两配对为水平线（0-1 胸廓线，2-3 骶骨线），拖动时锁定 y 坐标
          const pairIndex =
            selectionState.pointIndex % 2 === 0
              ? selectionState.pointIndex + 1
              : selectionState.pointIndex - 1;
          if (pairIndex >= 0 && pairIndex < measurement.points.length) {
            newPointY = measurement.points[pairIndex].y;
          }
        }

        const bindingPropagated = applyPointBindings(
          measurements,
          selectionState.measurementId,
          selectionState.pointIndex,
          newPointX,
          newPointY,
          pointBindings
        );

        const updatedMeasurements = bindingPropagated.map(item => {
          if (item.id === selectionState.measurementId) {
            const points = item.points.map((point, index) =>
              index === selectionState.pointIndex
                ? { x: newPointX, y: newPointY }
                : point
            );
            return {
              ...item,
              points,
              value:
                calculateMeasurementValue(item.type, points, {
                  standardDistance,
                  standardDistancePoints,
                  imageNaturalSize,
                }) || item.value,
            };
          }

          const originalMeasurement = measurements.find(
            original => original.id === item.id
          );
          const pointsChanged = originalMeasurement
            ? item.points.some((point, index) => {
                const originalPoint = originalMeasurement.points[index];
                return (
                  !originalPoint ||
                  point.x !== originalPoint.x ||
                  point.y !== originalPoint.y
                );
              })
            : false;

          if (pointsChanged) {
            return {
              ...item,
              value:
                calculateMeasurementValue(item.type, item.points, {
                  standardDistance,
                  standardDistancePoints,
                  imageNaturalSize,
                }) || item.value,
            };
          }

          return item;
        });

        onMeasurementsUpdate(updatedMeasurements);
        return true;
      }

      const xs = measurement.points.map(point => point.x);
      const ys = measurement.points.map(point => point.y);
      const currentCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const currentCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;
      const newCenterX = imagePoint.x - selectionState.dragOffset.x;
      const newCenterY = imagePoint.y - selectionState.dragOffset.y;
      const deltaX = newCenterX - currentCenterX;
      const deltaY = newCenterY - currentCenterY;
      const movedPoints = measurement.points.map(point => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }));

      let bindingPropagated = measurements;
      for (let pointIndex = 0; pointIndex < movedPoints.length; pointIndex += 1) {
        const movedPoint = movedPoints[pointIndex];
        bindingPropagated = applyPointBindings(
          bindingPropagated,
          selectionState.measurementId,
          pointIndex,
          movedPoint.x,
          movedPoint.y,
          pointBindings
        );
        bindingPropagated = bindingPropagated.map(item => {
          if (item.id !== selectionState.measurementId) return item;
          const points = item.points.map((point, index) =>
            index === pointIndex ? movedPoint : point
          );
          return { ...item, points };
        });
      }

      const updatedMeasurements = bindingPropagated.map(item => {
        const originalMeasurement = measurements.find(
          original => original.id === item.id
        );
        const pointsChanged = originalMeasurement
          ? item.points.some((point, index) => {
              const originalPoint = originalMeasurement.points[index];
              return (
                !originalPoint ||
                point.x !== originalPoint.x ||
                point.y !== originalPoint.y
              );
            })
          : false;

        if (pointsChanged) {
          return {
            ...item,
            value:
              calculateMeasurementValue(item.type, item.points, {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
              }) || item.value,
          };
        }
        return item;
      });

      onMeasurementsUpdate(updatedMeasurements);
      return true;
    }

    if (selectionState.pointIndex !== null) {
      const newPoints = [...clickedPoints];
      const newPoint = {
        x: imagePoint.x - selectionState.dragOffset.x,
        y: imagePoint.y - selectionState.dragOffset.y,
      };
      newPoints[selectionState.pointIndex] = newPoint;
      setClickedPoints(newPoints);

      if (
        selectedTool.includes('t1-tilt') &&
        selectionState.pointIndex === 0 &&
        referenceLines.t1Tilt
      ) {
        setReferenceLines(previous => ({ ...previous, t1Tilt: newPoint }));
      }

      return true;
    }

    return false;
  };

  const endDragSelection = () => {
    if (selectionState.isDragging) {
      setSelectionState(previous => ({ ...previous, isDragging: false }));
    }
  };

  return {
    handleMouseMove,
    endDragSelection,
  };
}
