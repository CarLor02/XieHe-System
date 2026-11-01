import type { Point } from '../../../../shared/domain/contracts';
import type {
  CalculationContext,
  ResolvedVariableMeasurement,
} from '../../../../measurements/domain';

export interface DrawingStyle {
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
  opacity?: number;
  fill?: string;
  part?: 'perimeter' | 'midline' | 'center';
}

/** 图元坐标均为投影后的画布坐标；不依赖 DOM、React 或原生 SVG。 */
export type DrawingPrimitive = DrawingStyle &
  (
    | { kind: 'line'; start: Point; end: Point }
    | { kind: 'circle'; center: Point; radius: number }
    | { kind: 'ellipse'; center: Point; rx: number; ry: number }
    | { kind: 'polygon'; points: Point[] }
    | {
        kind: 'arc';
        center: Point;
        radius: number;
        startAngle: number;
        endAngle: number;
      }
    | { kind: 'text'; point: Point; text: string; fontSize: number }
    | { kind: 'vertebra'; children: DrawingPrimitive[] }
  );

export interface DrawingContext {
  project?: (point: Point) => Point;
  calculationContext?: CalculationContext;
  resolvedMeasurement?: ResolvedVariableMeasurement;
  renderPelvicSharedGeometry?: boolean;
  effectiveCfhInteractionState?: 'idle' | 'hovered' | 'selected';
}

export type MeasurementDrawingId =
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
