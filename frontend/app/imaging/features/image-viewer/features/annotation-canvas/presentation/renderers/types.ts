import type { JSX } from 'react';

import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

export interface MeasurementRendererProps {
  measurement: MeasurementData;
  screenPoints: Point[];
  displayColor: string;
  imageScale: number;
}

export interface SpecialElementRenderContext {
  imagePoints: Point[];
  screenPoints: Point[];
  imageToScreen: (point: Point) => Point;
  calculationContext?: CalculationContext;
  /** PI/PT 共享双股骨头圆时，仅由列表中第一个可见测量项绘制一次。 */
  renderPelvicCircles?: boolean;
}

export interface AnnotationRendererRequest {
  screenPoints: Point[];
  displayColor: string;
  imageScale: number;
  context?: SpecialElementRenderContext;
}

export type AnnotationRenderer = (
  request: AnnotationRendererRequest
) => JSX.Element | null;
