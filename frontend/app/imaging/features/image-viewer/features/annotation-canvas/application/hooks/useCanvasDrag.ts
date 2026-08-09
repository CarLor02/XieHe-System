import { useRef } from 'react';
import {
  applyPointBindings,
  AnnotationBindings,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import {
  calculateMeasurementDataValue,
  calculateMeasurementValue,
} from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { resolveVariableMeasurement } from '@xiehe/imaging-core/measurements';
import {
  circleGeometryFromPoints,
  getCircleBounds,
} from '@xiehe/imaging-core/geometry';
import { normalizePelvicDraggedMeasurementPoints } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/pelvic-binding-rule';
import {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';
import { SelectionState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';
import {
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  moveHemipelvicVerticalLine,
  updateHemipelvicInteractivePoint,
} from '@xiehe/imaging-core/measurements/ap';
import {
  isAvtMetadata,
  updateHorizontalDiscAnchors,
} from '@xiehe/imaging-core/measurements/ap';
import {
  moveManualTtsTrunkLineVertically,
  resolveTtsMeasurement,
} from '@xiehe/imaging-core/measurements/ap';
import {
  type PelvicToolId,
} from '@xiehe/imaging-core/contracts';
import {
  getBilateralFemoralCenterPointIndices,
  moveBilateralPelvicEffectiveCfh,
} from '@xiehe/imaging-core/measurements/lateral';
import {
  getBilateralPelvicPointsForMeasurement,
  isBilateralPelvicMeasurement,
  replaceBilateralPelvicPointsForMeasurement,
} from '@xiehe/imaging-core/measurements/lateral';

interface UseCanvasDragOptions {
  examType?: string;
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
  /**
   * 禁止整体拖拽（type === 'whole'），只允许逐点拖拽。
   * 侧位关键点模式下启用，防止测量层与关键点层拖分离。
   */
  disableWholeDrag?: boolean;
  /** 可选：测量交互点拖动后将一项或多项新坐标写回关键点层。 */
  onMeasurementWriteback?: (
    measurementType: string,
    pointIndex: number | readonly number[],
    newPoint: Point,
    measurementId?: string,
    updatedPoints?: Point[],
    updatedMeasurements?: MeasurementData[]
  ) => boolean;
  imageToScreen: (point: Point) => Point;
  screenToImage: (screenX: number, screenY: number) => Point;
  referenceLines: {
    t1Tilt: Point | null;
  };
  setReferenceLines: React.Dispatch<
    React.SetStateAction<{
      t1Tilt: Point | null;
      ca: Point | null;
      po: Point | null;
      css: Point | null;
      avt: Point | null;
      ts: Point | null;
      lld: Point | null;
      ss: Point | null;
      sva: Point | null;
      horizontalLine: Point | null;
      verticalLine: Point | null;
    }>
  >;
  onAnnotationDragStart?: () => void;
}

/**
 * 画布拖拽更新逻辑。
 * 负责单点拖拽、整体拖拽、绑定传播以及测量值重算。
 */
export function useCanvasDrag({
  examType,
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
  disableWholeDrag,
  onMeasurementWriteback,
  imageToScreen,
  screenToImage,
  referenceLines,
  setReferenceLines,
  onAnnotationDragStart,
}: UseCanvasDragOptions) {
  const dragStartRef = useRef<Point | null>(null);
  const isManualTts = (measurement: MeasurementData) =>
    resolveTtsMeasurement(measurement)?.layout === 'manual';

  /**
   * 一次性提交拖拽结果。关键点工作流接管时，它会以画布已经计算好的
   * measurements 为基线写回关键点并重算依赖项；没有关键点更新时则由
   * 画布直接提交，避免同一次 pointermove 连续写两次 measurements。
   */
  const commitMeasurementDrag = (
    updatedMeasurements: MeasurementData[],
    measurementType: string,
    pointIndex: number | readonly number[],
    newPoint: Point,
    measurementId: string,
    updatedPoints: Point[]
  ) => {
    const handledByKeypoints =
      onMeasurementWriteback?.(
        measurementType,
        pointIndex,
        newPoint,
        measurementId,
        updatedPoints,
        updatedMeasurements
      ) ?? false;
    if (!handledByKeypoints) {
      onMeasurementsUpdate(updatedMeasurements);
    }
  };

  const beginInteraction = (x: number, y: number) => {
    dragStartRef.current = { x, y };
  };

  const updateInteraction = (
    x: number,
    y: number,
    primaryActionPressed: boolean,
    dragStartThreshold: number
  ) => {
    if (
      !(selectionState.measurementId || selectionState.pointIndex !== null) ||
      selectedTool !== 'hand' ||
      !primaryActionPressed
    ) {
      return false;
    }

    if (
      !selectionState.isDragging &&
      dragStartRef.current &&
      Math.hypot(x - dragStartRef.current.x, y - dragStartRef.current.y) <=
        dragStartThreshold
    ) {
      return true;
    }

    const imagePoint = screenToImage(x, y);

    if (!selectionState.isDragging) {
      let canDrag = false;

      if (selectionState.measurementId) {
        const measurement = measurements.find(
          item => item.id === selectionState.measurementId
        );
        if (measurement && measurement.points.length > 0) {
          if (
            examType &&
            resolveVariableMeasurement(measurement, { examType }).status ===
              'invalid'
          ) {
            return false;
          }
          const typeId = getAnnotationTypeId(measurement.type);
          let minX: number;
          let maxX: number;
          let minY: number;
          let maxY: number;

          if (selectionState.type === 'whole') {
            if (typeId === 'circle' && measurement.points.length >= 2) {
              const circle = circleGeometryFromPoints(measurement.points)!;
              const bounds = getCircleBounds(
                {
                  center: imageToScreen(circle.center),
                  radiusHandle: imageToScreen(circle.radiusHandle),
                },
                15
              );
              minX = bounds.minX;
              maxX = bounds.maxX;
              minY = bounds.minY;
              maxY = bounds.maxY;
            } else if (typeId === 'ellipse' && measurement.points.length >= 2) {
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
              (typeId === 'rectangle' || typeId === 'arrow') &&
              measurement.points.length >= 2
            ) {
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);
              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else {
              const resolvedTts = resolveTtsMeasurement(measurement);
              const interactionPoints =
                resolvedTts?.layout === 'manual'
                  ? resolvedTts.trunkPoints
                  : measurement.points;
              const screenPoints = interactionPoints.map(point =>
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

          const pointerScreenPoint = imageToScreen(imagePoint);
          if (
            pointerScreenPoint.x >= minX &&
            pointerScreenPoint.x <= maxX &&
            pointerScreenPoint.y >= minY &&
            pointerScreenPoint.y <= maxY
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

      const selectedMeasurement = selectionState.measurementId
        ? measurements.find(item => item.id === selectionState.measurementId)
        : null;
      const selectedTypeId = selectedMeasurement
        ? getAnnotationTypeId(selectedMeasurement.type)
        : null;
      // AVT 不允许整体拖拽，但允许逐点拖拽。
      if (selectedTypeId === 'avt' && selectionState.type === 'whole') {
        return false;
      }
      if (
        selectedTypeId === 'tts' &&
        selectionState.type === 'whole' &&
        selectedMeasurement &&
        !isManualTts(selectedMeasurement)
      ) {
        return false;
      }
      // 关键点联动测量默认禁止整体拖拽；手动 TTS 只移动未绑定的躯干线，可例外。
      if (
        disableWholeDrag &&
        selectionState.type === 'whole' &&
        selectedMeasurement &&
        !isManualTts(selectedMeasurement)
      ) {
        return false;
      }

      if (canDrag) {
        if (selectionState.measurementId) {
          onAnnotationDragStart?.();
        }
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
        examType &&
        resolveVariableMeasurement(measurement, { examType }).status ===
          'invalid'
      ) {
        return false;
      }
      const activeTypeId = getAnnotationTypeId(measurement.type);
      // AVT 整体拖拽禁止；TTS 允许整体拖拽（只移动躯干线，见下方）；逐点拖拽正常通过
      if (activeTypeId === 'avt' && selectionState.type === 'whole') {
        return false;
      }
      if (
        activeTypeId === 'tts' &&
        selectionState.type === 'whole' &&
        !isManualTts(measurement)
      ) {
        return false;
      }
      // 关键点联动测量默认禁止整体拖拽；手动 TTS 只移动未绑定的躯干线，可例外。
      if (
        disableWholeDrag &&
        selectionState.type === 'whole' &&
        !isManualTts(measurement)
      ) {
        return false;
      }

      if (
        selectionState.type === 'effective-cfh' &&
        isBilateralPelvicMeasurement(measurement)
      ) {
        const nextEffectiveCfh = {
          x: imagePoint.x - selectionState.dragOffset.x,
          y: imagePoint.y - selectionState.dragOffset.y,
        };
        const sourcePelvicPoints =
          getBilateralPelvicPointsForMeasurement(measurement);
        if (!sourcePelvicPoints) return false;
        const movedPelvicPoints = moveBilateralPelvicEffectiveCfh(
          sourcePelvicPoints,
          nextEffectiveCfh
        );
        // PI/PT/TPA 共享同一组双 FH 几何。拖动派生中点时同时平移两圆，
        // 但保留每个圆半径、圆心间距和 S1 两点。
        const updatedMeasurements = measurements.map(item => {
          if (!isBilateralPelvicMeasurement(item)) return item;
          const points = replaceBilateralPelvicPointsForMeasurement(
            item,
            movedPelvicPoints
          );
          return {
            ...item,
            points,
            value:
              calculateMeasurementDataValue(
                { ...item, points },
                {
                  standardDistance,
                  standardDistancePoints,
                  imageNaturalSize,
                  examType,
                }
              ) || item.value,
          };
        });

        const selectedPoints = updatedMeasurements.find(
          item => item.id === measurement.id
        )?.points;
        if (!selectedPoints) return false;
        const toolId = getAnnotationTypeId(measurement.type) as PelvicToolId;
        // 一次写回两个真实 FH 圆心，避免两个状态更新相互覆盖。
        commitMeasurementDrag(
          updatedMeasurements,
          measurement.type,
          getBilateralFemoralCenterPointIndices(toolId),
          nextEffectiveCfh,
          measurement.id,
          selectedPoints
        );
        return true;
      }

      if (
        selectionState.type === 'point' &&
        selectionState.pointIndex !== null
      ) {
        let newPointX = imagePoint.x - selectionState.dragOffset.x;
        let newPointY = imagePoint.y - selectionState.dragOffset.y;

        const typeId = getAnnotationTypeId(measurement.type);
        if (typeId === HEMIPELVIC_WIDTH_RATIO_TOOL_ID) {
          const points = updateHemipelvicInteractivePoint(
            measurement.points,
            selectionState.pointIndex,
            { x: newPointX, y: newPointY }
          );
          const updatedMeasurements = measurements.map(item =>
            item.id === measurement.id
              ? {
                  ...item,
                  points,
                  value:
                    calculateMeasurementValue(item.type, points, {
                      standardDistance,
                      standardDistancePoints,
                      imageNaturalSize,
                    }) || item.value,
                }
              : item
          );
          commitMeasurementDrag(
            updatedMeasurements,
            measurement.type,
            selectionState.pointIndex,
            points[selectionState.pointIndex],
            measurement.id,
            points
          );
          return true;
        }

        if (
          typeId === 'avt' &&
          isAvtMetadata(measurement.avtMetadata) &&
          measurement.avtMetadata.target.type === 'disc' &&
          (selectionState.pointIndex === 0 || selectionState.pointIndex === 1)
        ) {
          const anchors = updateHorizontalDiscAnchors(
            [measurement.points[0], measurement.points[1]],
            selectionState.pointIndex,
            { x: newPointX, y: newPointY }
          );
          const points = [...anchors, ...measurement.points.slice(2)];
          const nextMeasurement = {
            ...measurement,
            points,
          };
          nextMeasurement.value = calculateMeasurementDataValue(
            nextMeasurement,
            {
              standardDistance,
              standardDistancePoints,
              imageNaturalSize,
              examType,
            }
          );
          onMeasurementsUpdate(
            measurements.map(item =>
              item.id === measurement.id ? nextMeasurement : item
            )
          );
          return true;
        }

        if (typeId === 'aux-horizontal-line') {
          const otherIndex = selectionState.pointIndex === 0 ? 1 : 0;
          newPointY = measurement.points[otherIndex].y;
        }
        if (typeId === 'aux-vertical-line') {
          const otherIndex = selectionState.pointIndex === 0 ? 1 : 0;
          newPointX = measurement.points[otherIndex].x;
        }
        if (typeId === 'tts') {
          // 仅躯干参考线（点 0-1）保持水平，拖动时锁定 y 坐标。
          // 骶骨参考线（点 2-3）继承自 CSS / Sacral，需保留其原始倾斜，
          // 否则会通过点绑定把 CSS 的 y 拉平、CSS 角度被强制为 0°。
          if (
            selectionState.pointIndex === 0 ||
            selectionState.pointIndex === 1
          ) {
            const pairIndex = selectionState.pointIndex === 0 ? 1 : 0;
            if (pairIndex < measurement.points.length) {
              newPointY = measurement.points[pairIndex].y;
            }
          }
        }

        const requestedPoints = measurement.points.map((point, index) =>
          index === selectionState.pointIndex
            ? { x: newPointX, y: newPointY }
            : point
        );
        const selectedMeasurementPoints =
          normalizePelvicDraggedMeasurementPoints(
            measurement,
            requestedPoints,
            selectionState.pointIndex
          );
        const selectedPoint =
          selectedMeasurementPoints[selectionState.pointIndex];
        const bindingPropagated = applyPointBindings(
          measurements,
          selectionState.measurementId,
          selectionState.pointIndex,
          selectedPoint.x,
          selectedPoint.y,
          pointBindings
        );

        let updatedMeasurements = bindingPropagated.map(item => {
          if (item.id === selectionState.measurementId) {
            const points = selectedMeasurementPoints;
            return {
              ...item,
              points,
              value:
                calculateMeasurementDataValue(
                  { ...item, points },
                  {
                    standardDistance,
                    standardDistancePoints,
                    imageNaturalSize,
                    examType,
                  }
                ) || item.value,
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
                calculateMeasurementDataValue(item, {
                  standardDistance,
                  standardDistancePoints,
                  imageNaturalSize,
                  examType,
                }) || item.value,
            };
          }

          return item;
        });

        const selectedPelvicPoints = getBilateralPelvicPointsForMeasurement({
          ...measurement,
          points: selectedMeasurementPoints,
        });
        if (selectedPelvicPoints) {
          // PI、PT 与 TPA 共用双 FH 圆和 S1 端点。半径点不是全局关键点，
          // 因此必须在测量层同步，不能只依靠关键点写回。
          updatedMeasurements = updatedMeasurements.map(item => {
            if (
              item.id === measurement.id ||
              !isBilateralPelvicMeasurement(item)
            ) {
              return item;
            }
            const points = replaceBilateralPelvicPointsForMeasurement(
              item,
              selectedPelvicPoints
            );
            return {
              ...item,
              points,
              value:
                calculateMeasurementDataValue(
                  { ...item, points },
                  {
                    standardDistance,
                    standardDistancePoints,
                    imageNaturalSize,
                    examType,
                  }
                ) || item.value,
            };
          });
        }

        const updatedMeasurement = updatedMeasurements.find(
          item => item.id === measurement.id
        );
        if (updatedMeasurement) {
          commitMeasurementDrag(
            updatedMeasurements,
            measurement.type,
            selectionState.pointIndex,
            selectedPoint,
            measurement.id,
            updatedMeasurement.points
          );
        } else {
          onMeasurementsUpdate(updatedMeasurements);
        }

        return true;
      }

      if (
        selectionState.type === 'line' &&
        selectionState.pointIndex !== null &&
        activeTypeId === HEMIPELVIC_WIDTH_RATIO_TOOL_ID
      ) {
        const points = moveHemipelvicVerticalLine(
          measurement.points,
          selectionState.pointIndex,
          imagePoint.x - selectionState.dragOffset.x
        );
        const updatedMeasurements = measurements.map(item =>
          item.id === measurement.id
            ? {
                ...item,
                points,
                value:
                  calculateMeasurementValue(item.type, points, {
                    standardDistance,
                    standardDistancePoints,
                    imageNaturalSize,
                  }) || item.value,
              }
            : item
        );
        commitMeasurementDrag(
          updatedMeasurements,
          measurement.type,
          selectionState.pointIndex,
          points[selectionState.pointIndex],
          measurement.id,
          points
        );
        return true;
      }

      if (selectionState.type !== 'whole') {
        return false;
      }

      // 手工 TTS 整体拖拽只移动躯干线（点0-1），且只允许垂直位移。
      const isManualTtsDrag = isManualTts(measurement);
      const centerPoints = isManualTtsDrag
        ? measurement.points.slice(0, 2)
        : measurement.points;
      const xs = centerPoints.map(point => point.x);
      const ys = centerPoints.map(point => point.y);
      const currentCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const currentCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;
      const newCenterX = imagePoint.x - selectionState.dragOffset.x;
      const newCenterY = imagePoint.y - selectionState.dragOffset.y;
      const deltaX = isManualTtsDrag ? 0 : newCenterX - currentCenterX;
      const deltaY = newCenterY - currentCenterY;
      const movedPoints = isManualTtsDrag
        ? moveManualTtsTrunkLineVertically(measurement, deltaY)
        : measurement.points.map(point => ({
            x: point.x + deltaX,
            y: point.y + deltaY,
          }));

      let bindingPropagated = measurements;
      for (
        let pointIndex = 0;
        pointIndex < movedPoints.length;
        pointIndex += 1
      ) {
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
              calculateMeasurementDataValue(item, {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
                examType,
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
    dragStartRef.current = null;
    if (selectionState.isDragging) {
      setSelectionState(previous => ({ ...previous, isDragging: false }));
    }
  };

  return {
    beginInteraction,
    updateInteraction,
    endDragSelection,
  };
}
