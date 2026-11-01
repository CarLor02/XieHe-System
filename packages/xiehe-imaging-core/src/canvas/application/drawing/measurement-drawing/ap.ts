import type {
  MeasurementData,
  Point,
} from '../../../../shared/domain/contracts';
import {
  getAvtGeometry,
  isAvtMetadata,
  calculateHemipelvicWidthRatioGeometry,
} from '../../../../measurements/domain/manual-tools/ap';
import { calculateActualDistance } from '../../../../measurements/domain';
import {
  DrawingBuilder,
  DRAWING_IMAGE_LENGTHS as lengths,
  midpoint,
} from './primitives';
import type { DrawingContext, DrawingPrimitive } from './types';

export function buildC7OffsetDrawing(
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  const b = new DrawingBuilder(context),
    height = lengths.verticalGuideLength;
  if (!points.length) return [];
  if (points.length >= 2 && points.length < 6) {
    // 两点历史格式没有椎体轮廓，保持原中心点语义，不能猜测四角。
    const [a, c] = points;
    const top = Math.min(a.y, c.y) - height / 2,
      bottom = Math.max(a.y, c.y) + height / 2;
    for (const p of [a, c])
      b.line({ x: p.x, y: top }, { x: p.x, y: bottom }, { dash: '3,3' });
    const y = (a.y + c.y) / 2;
    b.line({ x: a.x, y }, { x: c.x, y });
    b.dot({ x: a.x, y });
    b.dot({ x: c.x, y });
    return b.primitives;
  }
  const center = points.length >= 4 ? b.vertebra(points, 0.4) : points[0];
  b.line(center, { x: center.x, y: center.y + height }, { dash: '3,3' });
  if (points.length >= 6) {
    const reference = midpoint(points[4], points[5]);
    b.line(points[4], points[5], { strokeWidth: 1, dash: '5,5', opacity: 0.5 });
    b.dot(reference, { opacity: 0.8 });
    b.line({ x: reference.x, y: reference.y - height }, reference, {
      dash: '3,3',
    });
  }
  return b.primitives;
}

export function buildAvtDrawing(
  measurement: MeasurementData,
  context: DrawingContext = {}
): DrawingPrimitive[] {
  if (!isAvtMetadata(measurement.avtMetadata))
    return buildC7OffsetDrawing(measurement.points, context);
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return [];
  const b = new DrawingBuilder(context);
  if (measurement.avtMetadata.target.type === 'vertebra')
    b.vertebra(geometry.targetPoints, 0.55);
  else b.line(geometry.targetPoints[0], geometry.targetPoints[1]);
  if (geometry.referenceLine === 'c7pl')
    b.vertebra(geometry.referencePoints, 0.55);
  else
    b.line(geometry.referencePoints[0], geometry.referencePoints[1], {
      strokeWidth: 1,
      dash: '5,5',
      opacity: 0.6,
    });
  const ys = [
    ...geometry.targetPoints,
    ...geometry.referencePoints,
    geometry.targetCenter,
  ].map(p => p.y);
  const padding = Math.max(24, (Math.max(...ys) - Math.min(...ys)) * 0.2);
  b.line(
    { x: geometry.referenceCenter.x, y: Math.min(...ys) - padding },
    { x: geometry.referenceCenter.x, y: Math.max(...ys) + padding },
    { dash: '3,3' }
  );
  b.line(geometry.targetCenter, {
    x: geometry.referenceCenter.x,
    y: geometry.targetCenter.y,
  });
  if (measurement.avtMetadata.target.type === 'disc')
    b.dot(geometry.targetCenter);
  if (geometry.referenceLine === 'csvl') b.dot(geometry.referenceCenter);
  return b.primitives;
}

export function buildTtsDrawing(
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  const b = new DrawingBuilder(context);
  if (points.length < 2) return [];
  const trunk = midpoint(points[0], points[1]);
  b.line(points[0], points[1]);
  b.line(
    trunk,
    { x: trunk.x, y: trunk.y + lengths.verticalGuideLength },
    { dash: '4,4' }
  );
  if (points.length >= 4) {
    const sacral = midpoint(points[2], points[3]);
    b.line(points[2], points[3], { opacity: 0.6 });
    b.line({ x: sacral.x, y: sacral.y - lengths.verticalGuideLength }, sacral, {
      dash: '4,4',
      opacity: 0.7,
    });
    const y = (trunk.y + sacral.y) / 2;
    b.horizontalArrows({ x: trunk.x, y }, { x: sacral.x, y });
  }
  return b.primitives;
}

export function buildHemipelvicDrawing(
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  const geometry = calculateHemipelvicWidthRatioGeometry(points);
  if (!geometry) return [];
  const b = new DrawingBuilder(context);
  for (const line of geometry.lines) {
    b.line(line.top, line.bottom);
    const top = b.project(line.top),
      bottom = b.project(line.bottom);
    b.primitives.push({
      kind: 'text',
      point: { x: top.x, y: Math.min(top.y, bottom.y) - 8 },
      text: line.label,
      fontSize: 10,
    });
  }
  for (const [label, first, second, pixels] of [
    ['dL', 0, 1, geometry.dLPixels],
    ['dR', 2, 3, geometry.dRPixels],
  ] as const) {
    const a = b.project(geometry.lines[first].anchor),
      c = b.project(geometry.lines[second].anchor);
    const y = Math.max(a.y, c.y) + 20;
    b.primitives.push({
      kind: 'line',
      start: { x: a.x, y },
      end: { x: c.x, y },
      dash: '4,3',
      strokeWidth: 1.5,
    });
    for (const x of [a.x, c.x])
      b.primitives.push({
        kind: 'line',
        start: { x, y: y - 5 },
        end: { x, y: y + 5 },
        strokeWidth: 1.5,
      });
    const value = context.calculationContext
      ? calculateActualDistance(pixels, context.calculationContext)
      : pixels;
    b.primitives.push({
      kind: 'text',
      point: { x: (a.x + c.x) / 2, y: y - 6 },
      text: `${label}: ${value.toFixed(2)}mm`,
      fontSize: 11,
    });
  }
  return b.primitives;
}
