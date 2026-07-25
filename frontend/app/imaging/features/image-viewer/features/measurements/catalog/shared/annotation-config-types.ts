import type { JSX } from 'react';

import type { CalculationContext, MeasurementResult } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * Catalog 对画布提供的展示契约。
 *
 * 这里只描述工具如何被注册和渲染；计算与命中实现由 manual-tools/domain 提供。
 */
export interface SpecialElementRenderContext {
  imagePoints: Point[];
  screenPoints: Point[];
  imageToScreen: (point: Point) => Point;
  calculationContext?: CalculationContext;
}

export interface AnnotationConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  pointsNeeded: number;
  category: 'measurement' | 'auxiliary';
  color: string;
  rightSideLabel?: boolean;
  maxXRightLabel?: boolean;
  apLabelGapX?: number;
  fixedLabelPosition?: boolean;
  interactivePointsCount?: number;
  showPointLabels?: boolean;
  preserveCanvasValue?: boolean;
  calculateResults: (
    points: Point[],
    context: CalculationContext
  ) => MeasurementResult[];
  getLabelPosition: (points: Point[], imageScale: number) => Point;
  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance?: number
  ) => boolean;
  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance?: number
  ) => boolean;
  renderSpecialElements?: (
    points: Point[],
    displayColor: string,
    imageScale: number,
    context?: SpecialElementRenderContext
  ) => JSX.Element | null;
}
