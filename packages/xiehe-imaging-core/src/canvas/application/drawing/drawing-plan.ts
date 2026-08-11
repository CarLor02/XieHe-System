import type { Point } from '../../../shared/domain/contracts';
import {
  circleGeometryToPoints,
  createCircleGeometry,
} from '../../../shared/domain/geometry';
import { constrainAuxiliaryLinePoint } from '../../domain';

export const POLYGON_CLOSE_TOLERANCE_PX = 18;

export type DynamicShapeToolId = 'circle' | 'ellipse' | 'rectangle' | 'arrow';
export type SpecialPointToolId =
  | 'polygon'
  | 'vertebra-center'
  | 'aux-length'
  | 'aux-angle'
  | 'aux-horizontal-line'
  | 'aux-vertical-line';

export interface MeasurementCompletionPlan {
  type: string;
  points: Point[];
}

export interface SpecialPointClickPlan {
  handled: boolean;
  clickedPoints: Point[];
  completion: MeasurementCompletionPlan | null;
}

export function isDynamicShapeTool(
  toolId: string
): toolId is DynamicShapeToolId {
  return ['circle', 'ellipse', 'rectangle', 'arrow'].includes(toolId);
}

export function planDynamicShapeCompletion(
  toolId: string,
  startPoint: Point,
  endPoint: Point
): MeasurementCompletionPlan | null {
  if (!isDynamicShapeTool(toolId)) return null;
  if (toolId === 'circle') {
    return {
      type: toolId,
      points: circleGeometryToPoints(
        createCircleGeometry(startPoint, endPoint)
      ),
    };
  }
  if (toolId === 'rectangle') {
    return {
      type: toolId,
      points: [
        {
          x: Math.min(startPoint.x, endPoint.x),
          y: Math.min(startPoint.y, endPoint.y),
        },
        {
          x: Math.max(startPoint.x, endPoint.x),
          y: Math.max(startPoint.y, endPoint.y),
        },
      ],
    };
  }
  return { type: toolId, points: [startPoint, endPoint] };
}

export function removeClickedPointNear(
  clickedPoints: readonly Point[],
  point: Point,
  tolerance: number
): Point[] | null {
  const index = clickedPoints.findIndex(
    clicked => Math.hypot(point.x - clicked.x, point.y - clicked.y) < tolerance
  );
  return index < 0
    ? null
    : clickedPoints.filter((_, pointIndex) => pointIndex !== index);
}

export function planSpecialPointToolClick(input: {
  toolId: string;
  clickedPoints: readonly Point[];
  point: Point;
  imageScale: number;
}): SpecialPointClickPlan {
  const { toolId, clickedPoints, point, imageScale } = input;
  if (toolId === 'polygon') {
    const firstPoint = clickedPoints[0];
    const shouldClose =
      clickedPoints.length >= 3 &&
      firstPoint !== undefined &&
      Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y) <=
        POLYGON_CLOSE_TOLERANCE_PX / imageScale;
    return shouldClose
      ? {
          handled: true,
          clickedPoints: [],
          completion: { type: toolId, points: [...clickedPoints] },
        }
      : {
          handled: true,
          clickedPoints: [...clickedPoints, point],
          completion: null,
        };
  }

  const fixedPointCounts: Partial<Record<SpecialPointToolId, number>> = {
    'vertebra-center': 4,
    'aux-length': 2,
    'aux-angle': 4,
    'aux-horizontal-line': 2,
    'aux-vertical-line': 2,
  };
  const pointsNeeded = fixedPointCounts[toolId as SpecialPointToolId];
  if (!pointsNeeded) {
    return {
      handled: false,
      clickedPoints: [...clickedPoints],
      completion: null,
    };
  }

  const constrainedPoint =
    clickedPoints.length === 1 &&
    (toolId === 'aux-horizontal-line' || toolId === 'aux-vertical-line')
      ? constrainAuxiliaryLinePoint(toolId, clickedPoints[0], point)
      : point;
  const next = [...clickedPoints, constrainedPoint];
  return next.length === pointsNeeded
    ? {
        handled: true,
        clickedPoints: [],
        completion: { type: toolId, points: next },
      }
    : { handled: true, clickedPoints: next, completion: null };
}
