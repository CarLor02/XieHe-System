import type { MeasurementData, Point } from '../../../shared/domain/contracts';
import { getVertebraCenterGeometry } from '../../../shared/domain/geometry';
import {
  getAnnotationTypeId,
  resolveVariableMeasurement,
} from '../../../measurements/domain';
import {
  getHemipelvicVerticalLines,
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
} from '../../../measurements/domain/manual-tools/ap';
import {
  getBilateralPelvicGeometryForMeasurement,
  isBilateralPelvicMeasurement,
} from '../../../measurements/domain/manual-tools/lateral';
import {
  CANVAS_INTERACTION_CONSTANTS,
  getBilateralPelvicGeometryOwnerId,
  isAuxiliaryShape,
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
  type TransformContext,
} from '../../domain';

export type MeasurementHitResult =
  | { kind: 'point'; measurementId: string; pointIndex: number }
  | { kind: 'line'; measurementId: string; lineIndex: number }
  | { kind: 'effective-cfh'; measurementId: string }
  | { kind: 'whole'; measurementId: string }
  | { kind: 'label'; measurementId: string }
  | { kind: 'none' };

export interface MeasurementHitTestPolicy {
  getInteractivePointsCount?: (type: string) => number | undefined;
  isEditableAuxiliary?: (type: string) => boolean;
  hitTestLabel?: (measurement: MeasurementData) => boolean;
}

export interface HitTestMeasurementPointOptions {
  measurement: MeasurementData;
  screenPoint: Point;
  imageToScreen: (point: Point) => Point;
  radius?: number;
  getInteractivePointsCount?: (type: string) => number | undefined;
}

export function hitTestMeasurementPoint({
  measurement,
  screenPoint,
  imageToScreen,
  radius = CANVAS_INTERACTION_CONSTANTS.pointHitRadius,
  getInteractivePointsCount,
}: HitTestMeasurementPointOptions): number | null {
  const interactiveCount = getInteractivePointsCount?.(measurement.type);
  const limit = interactiveCount ?? measurement.points.length;

  for (let index = 0; index < limit; index += 1) {
    const pointScreen = imageToScreen(measurement.points[index]);
    if (
      Math.hypot(screenPoint.x - pointScreen.x, screenPoint.y - pointScreen.y) <
      radius
    ) {
      return index;
    }
  }

  return null;
}

export interface HitTestWorkingPointOptions {
  points: Point[];
  screenPoint: Point;
  imageToScreen: (point: Point) => Point;
  radius?: number;
}

export function hitTestWorkingPoint({
  points,
  screenPoint,
  imageToScreen,
  radius = CANVAS_INTERACTION_CONSTANTS.pointHitRadius,
}: HitTestWorkingPointOptions): number | null {
  for (let index = 0; index < points.length; index += 1) {
    const pointScreen = imageToScreen(points[index]);
    if (
      Math.hypot(screenPoint.x - pointScreen.x, screenPoint.y - pointScreen.y) <
      radius
    ) {
      return index;
    }
  }

  return null;
}

interface HitTestMeasurementOptions {
  measurements: MeasurementData[];
  examType?: string;
  screenPoint: Point;
  imageToScreen: (point: Point) => Point;
  context: TransformContext;
  policy?: MeasurementHitTestPolicy;
  isMeasurementHidden?: (measurement: MeasurementData) => boolean;
  pointRadius?: number;
  lineRadius?: number;
}

function hitTestMeasurementShape(
  measurement: MeasurementData,
  screenPoint: Point,
  context: TransformContext,
  lineRadius: number,
  imageToScreen: (point: Point) => Point
): boolean {
  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'circle' && measurement.points.length === 2) {
    return isCircleClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }
  if (typeId === 'ellipse' && measurement.points.length === 2) {
    return isEllipseClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }
  if (typeId === 'rectangle' && measurement.points.length === 2) {
    return isRectangleClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }
  if (typeId === 'polygon' && measurement.points.length >= 3) {
    return isPolygonClicked(
      screenPoint,
      measurement.points,
      context,
      lineRadius
    );
  }
  if (
    [
      'arrow',
      'aux-length',
      'aux-horizontal-line',
      'aux-vertical-line',
    ].includes(typeId) &&
    measurement.points.length >= 2
  ) {
    return isLineClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }
  if (typeId === 'vertebra-center' && measurement.points.length === 4) {
    const geometry = getVertebraCenterGeometry([
      measurement.points[0],
      measurement.points[1],
      measurement.points[2],
      measurement.points[3],
    ]);
    if (
      isPolygonClicked(screenPoint, geometry.perimeter, context, lineRadius) ||
      isLineClicked(
        screenPoint,
        geometry.topBottomMidline[0],
        geometry.topBottomMidline[1],
        context,
        lineRadius
      ) ||
      isLineClicked(
        screenPoint,
        geometry.leftRightMidline[0],
        geometry.leftRightMidline[1],
        context,
        lineRadius
      )
    ) {
      return true;
    }
    const centerScreen = imageToScreen(geometry.center);
    return (
      Math.hypot(
        screenPoint.x - centerScreen.x,
        screenPoint.y - centerScreen.y
      ) < 15
    );
  }
  if (typeId === 'aux-angle' && measurement.points.length >= 4) {
    return (
      isLineClicked(
        screenPoint,
        measurement.points[0],
        measurement.points[1],
        context,
        lineRadius
      ) ||
      isLineClicked(
        screenPoint,
        measurement.points[2],
        measurement.points[3],
        context,
        lineRadius
      )
    );
  }
  return false;
}

/**
 * 跨端 measurement 命中编排。平台只注入标签文字测量与 catalog 交互元数据。
 * effective-cfh 表示不占用持久化 pointIndex 的双 FH 派生句柄。
 */
export function hitTestCanvasMeasurement({
  measurements,
  examType,
  screenPoint,
  imageToScreen,
  context,
  policy = {},
  isMeasurementHidden,
  pointRadius,
  lineRadius = 8,
}: HitTestMeasurementOptions): MeasurementHitResult {
  const pelvicGeometryOwnerId = getBilateralPelvicGeometryOwnerId(
    measurements,
    measurement => isMeasurementHidden?.(measurement) ?? false
  );

  for (const measurement of measurements) {
    if (isMeasurementHidden?.(measurement)) continue;

    const variableResolution = examType
      ? resolveVariableMeasurement(measurement, { examType })
      : { status: 'not-applicable' as const };
    if (variableResolution.status === 'invalid') continue;

    const pointIndex = hitTestMeasurementPoint({
      measurement,
      screenPoint,
      imageToScreen,
      radius: pointRadius,
      getInteractivePointsCount: policy.getInteractivePointsCount,
    });
    if (pointIndex !== null) {
      return { kind: 'point', measurementId: measurement.id, pointIndex };
    }

    if (
      measurement.id === pelvicGeometryOwnerId &&
      isBilateralPelvicMeasurement(measurement)
    ) {
      const center =
        getBilateralPelvicGeometryForMeasurement(
          measurement
        )?.femoralHeadCenter;
      if (center) {
        const centerScreen = imageToScreen(center);
        if (
          Math.hypot(
            screenPoint.x - centerScreen.x,
            screenPoint.y - centerScreen.y
          ) < (pointRadius ?? 12)
        ) {
          return { kind: 'effective-cfh', measurementId: measurement.id };
        }
      }
    }

    const ttsTrunkPoints =
      variableResolution.status === 'resolved' &&
      variableResolution.value.kind === 'tts' &&
      variableResolution.value.layout === 'manual'
        ? variableResolution.value.trunkPoints
        : null;
    if (
      ttsTrunkPoints &&
      isLineClicked(
        screenPoint,
        ttsTrunkPoints[0],
        ttsTrunkPoints[1],
        context,
        lineRadius
      )
    ) {
      return { kind: 'whole', measurementId: measurement.id };
    }

    if (
      getAnnotationTypeId(measurement.type) === HEMIPELVIC_WIDTH_RATIO_TOOL_ID
    ) {
      const hitLine = getHemipelvicVerticalLines(measurement.points).find(
        line =>
          isLineClicked(screenPoint, line.top, line.bottom, context, lineRadius)
      );
      if (hitLine) {
        return {
          kind: 'line',
          measurementId: measurement.id,
          lineIndex: hitLine.sourceIndex,
        };
      }
    }

    const supportShape = isAuxiliaryShape(measurement.type);
    const editableAuxiliary =
      policy.isEditableAuxiliary?.(measurement.type) ?? false;
    if (
      (supportShape || editableAuxiliary) &&
      hitTestMeasurementShape(
        measurement,
        screenPoint,
        context,
        lineRadius,
        imageToScreen
      )
    ) {
      return { kind: 'whole', measurementId: measurement.id };
    }
    if (editableAuxiliary && policy.hitTestLabel?.(measurement)) {
      return { kind: 'whole', measurementId: measurement.id };
    }
    if (supportShape) continue;
    if (policy.hitTestLabel?.(measurement)) {
      return { kind: 'label', measurementId: measurement.id };
    }
  }

  return { kind: 'none' };
}
