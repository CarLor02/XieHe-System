import type { JSX } from 'react';

import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import type { ResolvedVariableMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain';
import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';

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
  /** PI/PT/TPA 共享双 FH 圆、圆心连线和 effectiveCFH 时，仅由首个可见项绘制一次。 */
  renderPelvicSharedGeometry?: boolean;
  effectiveCfhInteractionState?: 'idle' | 'hovered' | 'selected';
  /** 已保存的可变布局 measurement 必须由领域 resolver 解析后交给 renderer。 */
  resolvedMeasurement?: ResolvedVariableMeasurement;
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
