import { useRef } from 'react';
import {
  applyPointBindings,
  AnnotationBindings,
} from '@xiehe/imaging-core/bindings';
import {
  calculateMeasurementDataValue,
  calculateMeasurementValue,
} from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { getAnnotationTypeId } from '@xiehe/imaging-catalog/annotations';
import { resolveVariableMeasurement } from '@xiehe/imaging-core/measurements';
import { normalizePelvicDraggedMeasurementPoints } from '@xiehe/imaging-core/measurement-keypoint-sync';
import { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type {
  ReferenceLines,
  SelectionState,
} from '@xiehe/imaging-core/canvas';
import {
  canDragWholeMeasurement,
  constrainDraggedMeasurementPoint,
  getMeasurementSelectionBox,
  getMeasurementSelectionBoxInScreen,
  isPointInSelectionBox,
  planWholeMeasurementDrag,
} from '@xiehe/imaging-core/canvas';
import {
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  moveHemipelvicVerticalLine,
  updateHemipelvicInteractivePoint,
} from '@xiehe/imaging-core/measurements/ap';
import {
  isAvtMetadata,
  updateHorizontalDiscAnchors,
} from '@xiehe/imaging-core/measurements/ap';
import { type PelvicToolId } from '@xiehe/imaging-core/contracts';
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
  referenceLines: Pick<ReferenceLines, 't1Tilt'>;
  setReferenceLines: React.Dispatch<React.SetStateAction<ReferenceLines>>;
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
          const bounds =
            selectionState.type === 'whole'
              ? getMeasurementSelectionBoxInScreen(
                  measurement,
                  imageToScreen,
                  15
                )
              : getMeasurementSelectionBox(
                  {
                    ...measurement,
                    points: measurement.points.map(imageToScreen),
                  },
                  15
                );
          const pointerScreenPoint = imageToScreen(imagePoint);
          if (isPointInSelectionBox(pointerScreenPoint, bounds)) {
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
      if (
        selectionState.type === 'whole' &&
        selectedMeasurement &&
        !canDragWholeMeasurement(selectedMeasurement, Boolean(disableWholeDrag))
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
      if (
        selectionState.type === 'whole' &&
        !canDragWholeMeasurement(measurement, Boolean(disableWholeDrag))
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
        const requestedPoint = {
          x: imagePoint.x - selectionState.dragOffset.x,
          y: imagePoint.y - selectionState.dragOffset.y,
        };

        const typeId = getAnnotationTypeId(measurement.type);
        if (typeId === HEMIPELVIC_WIDTH_RATIO_TOOL_ID) {
          const points = updateHemipelvicInteractivePoint(
            measurement.points,
            selectionState.pointIndex,
            requestedPoint
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
            requestedPoint
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

        const constrainedPoint = constrainDraggedMeasurementPoint({
          measurement,
          pointIndex: selectionState.pointIndex,
          requestedPoint,
        });

        const requestedPoints = measurement.points.map((point, index) =>
          index === selectionState.pointIndex ? constrainedPoint : point
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

      const newCenterX = imagePoint.x - selectionState.dragOffset.x;
      const newCenterY = imagePoint.y - selectionState.dragOffset.y;
      const movedPoints = planWholeMeasurementDrag(measurement, {
        x: newCenterX,
        y: newCenterY,
      });

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
