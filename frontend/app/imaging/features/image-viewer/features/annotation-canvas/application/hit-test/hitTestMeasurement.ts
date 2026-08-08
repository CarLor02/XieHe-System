import {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/hit-test/shape-hit-test';
import { isAuxiliaryShape } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/tools/tool-interaction-policy';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { isEditableAuxiliaryAnnotationType } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-metadata';
import { calculateQuadrilateralCenter } from '@/app/imaging/features/image-viewer/shared/geometry';
import {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { TransformContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/viewport-transform';
import { hitTestMeasurementLabel } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hit-test/hitTestLabel';
import { hitTestMeasurementPoint } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hit-test/hitTestPoint';
import {
  getHemipelvicVerticalLines,
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/hemipelvic-width-ratio';
import { getManualTtsTrunkPoints } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/tts';
import {
  getBilateralPelvicGeometryOwnerId,
  isBilateralPelvicMeasurement,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/pelvic-shared-geometry';
import { getPelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';

export type HitResult =
  | { kind: 'point'; measurementId: string; pointIndex: number }
  | { kind: 'line'; measurementId: string; lineIndex: number }
  | { kind: 'effective-cfh'; measurementId: string }
  | { kind: 'whole'; measurementId: string }
  | { kind: 'label'; measurementId: string }
  | { kind: 'none' };

interface HitTestMeasurementOptions {
  measurements: MeasurementData[];
  screenPoint: Point;
  imageScale: number;
  imageToScreen: (point: Point) => Point;
  context: TransformContext;
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
) {
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
    (typeId === 'arrow' ||
      typeId === 'aux-length' ||
      typeId === 'aux-horizontal-line' ||
      typeId === 'aux-vertical-line') &&
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
    if (
      isPolygonClicked(screenPoint, measurement.points, context, lineRadius)
    ) {
      return true;
    }

    const center = calculateQuadrilateralCenter(measurement.points);
    const centerScreen = imageToScreen(center);

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
 * 统一 measurement 命中检测。
 * 入口组件只消费明确的命中类型，不再直接了解各工具的几何细节。
 * effective-cfh 专门表示不占用持久化 pointIndex 的双 FH 派生句柄。
 */
export function hitTestMeasurement({
  measurements,
  screenPoint,
  imageScale,
  imageToScreen,
  context,
  isMeasurementHidden,
  pointRadius,
  lineRadius = 8,
}: HitTestMeasurementOptions): HitResult {
  const pelvicGeometryOwnerId = getBilateralPelvicGeometryOwnerId(
    measurements,
    measurement => isMeasurementHidden?.(measurement) ?? false
  );

  for (const measurement of measurements) {
    if (isMeasurementHidden?.(measurement)) {
      continue;
    }

    const pointIndex = hitTestMeasurementPoint({
      measurement,
      screenPoint,
      imageToScreen,
      radius: pointRadius,
    });
    if (pointIndex !== null) {
      return {
        kind: 'point',
        measurementId: measurement.id,
        pointIndex,
      };
    }

    // effectiveCFH 是双 FH 两圆心的派生中点，不占用持久化点下标。
    // 真实测量点优先命中，避免中点与圆心靠近时抢占已有点的拖动行为。
    if (
      measurement.id === pelvicGeometryOwnerId &&
      isBilateralPelvicMeasurement(measurement)
    ) {
      const geometry = getPelvicMeasurementGeometry(measurement.points);
      if (geometry?.femoralHeadCenter) {
        const center = imageToScreen(geometry.femoralHeadCenter);
        if (
          Math.hypot(screenPoint.x - center.x, screenPoint.y - center.y) <
          (pointRadius ?? 12)
        ) {
          return {
            kind: 'effective-cfh',
            measurementId: measurement.id,
          };
        }
      }
    }

    const ttsTrunkPoints = getManualTtsTrunkPoints(measurement);
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

    const isSupportShape = isAuxiliaryShape(measurement.type);
    const isEditableAuxiliary = isEditableAuxiliaryAnnotationType(
      measurement.type
    );

    if (isSupportShape || isEditableAuxiliary) {
      if (
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

      if (
        isEditableAuxiliary &&
        hitTestMeasurementLabel({
          measurement,
          screenPoint,
          imageScale,
          imageToScreen,
        })
      ) {
        return { kind: 'whole', measurementId: measurement.id };
      }
    }

    if (isSupportShape) {
      continue;
    }

    if (
      hitTestMeasurementLabel({
        measurement,
        screenPoint,
        imageScale,
        imageToScreen,
      })
    ) {
      return { kind: 'label', measurementId: measurement.id };
    }
  }

  return { kind: 'none' };
}

export {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
};
