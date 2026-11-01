import type { Point } from '../../../../shared/domain/contracts';
import {
  buildC7OffsetDrawing,
  buildHemipelvicDrawing,
  buildTtsDrawing,
} from './ap';
import { buildPelvicDrawing, buildSsDrawing, buildSvaDrawing } from './lateral';
import {
  DrawingBuilder,
  DRAWING_IMAGE_LENGTHS as lengths,
  DRAWING_SCREEN_LENGTHS as screen,
  angle,
  midpoint,
} from './primitives';
import type {
  DrawingContext,
  DrawingPrimitive,
  MeasurementDrawingId,
} from './types';

export function buildMeasurementDrawing(
  id: MeasurementDrawingId,
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  switch (id) {
    case 'c7-offset':
      return buildC7OffsetDrawing(points, context);
    case 'tts':
      return buildTtsDrawing(points, context);
    case 'sva':
      return buildSvaDrawing(points, context);
    case 'pi':
    case 'pt':
    case 'tpa':
      return buildPelvicDrawing(id, points, context);
    case 'ss':
      return buildSsDrawing(points, context);
    case 'hemipelvic-width-ratio':
      return buildHemipelvicDrawing(points, context);
  }
  const b = new DrawingBuilder(context);
  if (!points.length) return [];
  if (id === 'single-horizontal-line' || id === 'single-vertical-line') {
    const a = points[0],
      half = lengths.fallbackGuideLength / 2;
    const fallback =
      id === 'single-horizontal-line'
        ? [
            { x: a.x - half, y: a.y },
            { x: a.x + half, y: a.y },
          ]
        : [
            { x: a.x, y: a.y - half },
            { x: a.x, y: a.y + half },
          ];
    b.line(points.length >= 2 ? a : fallback[0], points[1] ?? fallback[1], {
      dash: '5,5',
      opacity: 0.8,
    });
    return b.primitives;
  }
  if (points.length < 2) return [];
  const [a, c] = points;
  if (id === 'two-lines') {
    if (points.length < 4) return [];
    b.line(a, c, { dash: '3,3' });
    b.line(points[2], points[3], { dash: '3,3' });
  } else if (id === 'horizontal-lines') {
    for (const p of points.slice(0, 2))
      b.line(
        { x: p.x - lengths.horizontalGuideWidth / 2, y: p.y },
        { x: p.x + lengths.horizontalGuideWidth / 2, y: p.y },
        { dash: '3,3' }
      );
  } else if (id === 't1-tilt' || id === 't1-slope') {
    const [start, end] = a.x <= c.x ? [a, c] : [c, a];
    b.line(start, end);
    b.line(
      { x: start.x - lengths.t1TiltReferenceHalfWidth, y: start.y },
      { x: start.x + lengths.t1TiltReferenceHalfWidth, y: start.y },
      { stroke: '#00ff00', strokeWidth: 1, dash: '5,5', opacity: 0.7 }
    );
    let ray = angle(b.project(start), b.project(end));
    if (ray > 90) ray -= 180;
    else if (ray < -90) ray += 180;
    b.arc(b.project(start), 0, ray, screen.t1TiltArcRadius, { strokeWidth: 1 });
  } else {
    b.line(a, c);
    if (id === 'sacral-with-perpendicular') {
      const mid = midpoint(a, c);
      b.line(
        mid,
        { x: mid.x, y: mid.y - lengths.sacralPerpendicularLength },
        { stroke: '#22c55e', dash: '5,5', opacity: 0.8 }
      );
    }
  }
  return b.primitives;
}
