import {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
} from '../../../canvas/hit-test/shape-hit-test';
import { isAuxiliaryShape } from '../../../canvas/tools/tool-state';
import { getAnnotationTypeId } from '../../../catalog/annotation-catalog';
import { isEditableAuxiliaryAnnotationType } from '../../../domain/annotation-metadata';
import { calculateQuadrilateralCenter } from '../../../shared/geometry';
import { MeasurementData, Point, TransformContext } from '../../../types';
import { hitTestMeasurementLabel } from './hitTestLabel';
import { hitTestMeasurementPoint } from './hitTestPoint';

export type HitResult =
  | { kind: 'point'; measurementId: string; pointIndex: number }
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

  if (
    typeId === 'vertebra-center' &&
    measurement.points.length === 4
  ) {
    if (
      isPolygonClicked(screenPoint, measurement.points, context, lineRadius)
    ) {
      return true;
    }

    const center = calculateQuadrilateralCenter(measurement.points);
    const centerScreen = imageToScreen(center);

    return (
      Math.hypot(screenPoint.x - centerScreen.x, screenPoint.y - centerScreen.y) <
      15
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
 * 入口组件只关心 point / whole / label / none，不再直接了解几何细节。
 */
export function hitTestMeasurement({
  measurements,
  screenPoint,
  imageScale,
  imageToScreen,
  context,
  isMeasurementHidden,
  lineRadius = 8,
}: HitTestMeasurementOptions): HitResult {
  for (const measurement of measurements) {
    if (isMeasurementHidden?.(measurement)) {
      continue;
    }

    const pointIndex = hitTestMeasurementPoint({
      measurement,
      screenPoint,
      imageToScreen,
    });
    if (pointIndex !== null) {
      return {
        kind: 'point',
        measurementId: measurement.id,
        pointIndex,
      };
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
