import {
  hitTestCanvasMeasurement,
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
  type MeasurementHitResult,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import {
  getInteractivePointsCount,
  isEditableAuxiliaryAnnotationType,
} from '@xiehe/imaging-catalog/annotations';
import { hitTestMeasurementLabel } from './hitTestLabel';

export type HitResult = MeasurementHitResult;

interface HitTestMeasurementOptions {
  measurements: MeasurementData[];
  examType?: string;
  screenPoint: Point;
  imageScale: number;
  imageToScreen: (point: Point) => Point;
  context: TransformContext;
  isMeasurementHidden?: (measurement: MeasurementData) => boolean;
  pointRadius?: number;
  lineRadius?: number;
}

/** Web 仅适配 catalog 元数据和文字命中，命中优先级由 imaging-core 统一编排。 */
export function hitTestMeasurement({
  imageScale,
  ...options
}: HitTestMeasurementOptions): HitResult {
  return hitTestCanvasMeasurement({
    ...options,
    policy: {
      getInteractivePointsCount,
      isEditableAuxiliary: isEditableAuxiliaryAnnotationType,
      hitTestLabel: measurement =>
        hitTestMeasurementLabel({
          measurement,
          screenPoint: options.screenPoint,
          imageScale,
          imageToScreen: options.imageToScreen,
        }),
    },
  });
}

export {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
};
