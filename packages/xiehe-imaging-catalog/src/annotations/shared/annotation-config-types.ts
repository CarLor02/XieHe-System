import type {
  CalculationContext,
  MeasurementResult,
} from '@xiehe/imaging-core/measurements';
import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * Catalog 仅声明所需的视觉语义，具体 JSX renderer 由画布 presentation 注册。
 * 该抽象保证 measurements 不反向依赖 annotation-canvas。
 */
export type AnnotationRendererId =
  | 'c7-offset'
  | 'hemipelvic-width-ratio'
  | 'horizontal-lines'
  | 'pi'
  | 'pt'
  | 'sacral-with-perpendicular'
  | 'single-horizontal-line'
  | 'single-line-with-horizontal'
  | 'single-vertical-line'
  | 'ss'
  | 'sva'
  | 't1-slope'
  | 't1-tilt'
  | 'tpa'
  | 'tts'
  | 'two-lines';

/** 跨端工具栏使用的稳定展示结构，不包含任何平台组件。 */
export interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
  pointsNeeded: number;
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
  rendererId?: AnnotationRendererId;
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
}
