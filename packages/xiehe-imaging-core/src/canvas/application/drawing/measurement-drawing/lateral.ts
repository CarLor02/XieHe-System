import type { Point } from '../../../../shared/domain/contracts';
import {
  getPelvicMeasurementGeometry,
  getTpaGeometry,
  type PelvicMeasurementGeometry,
} from '../../../../measurements/domain/manual-tools/lateral';
import {
  DrawingBuilder,
  DRAWING_IMAGE_LENGTHS as lengths,
  DRAWING_SCREEN_LENGTHS as screen,
  angle,
  closestRay,
  distance,
} from './primitives';
import type { DrawingContext, DrawingPrimitive } from './types';

export function buildSvaDrawing(
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  if (points.length < 2) return [];
  const b = new DrawingBuilder(context);
  const anchors =
    points.length === 5
      ? [b.vertebra(points, 0.3, '#ffffff'), points[4]]
      : points.slice(0, 2);
  for (const p of anchors)
    b.line(
      p,
      { x: p.x, y: p.y + lengths.verticalGuideLength / 2 },
      { dash: '3,3' }
    );
  return b.primitives;
}

function pelvicArcRadius(reference: number, guide: number, inner: boolean) {
  const radius = Math.max(12, Math.min(36, reference * 0.35, guide * 0.45));
  return inner ? Math.max(9, radius - 10) : radius;
}

function addPelvicSharedGeometry(
  b: DrawingBuilder,
  geometry: PelvicMeasurementGeometry
) {
  if (
    !b.context.renderPelvicSharedGeometry ||
    geometry.mode !== 'bilateral' ||
    geometry.femoralHeadCircles.length !== 2 ||
    !geometry.femoralHeadCenter
  )
    return;
  for (const circle of geometry.femoralHeadCircles) {
    const center = b.project(circle.center),
      edge = b.project(circle.radiusHandle);
    b.primitives.push({
      kind: 'circle',
      center,
      radius: distance(center, edge),
      opacity: 0.9,
    });
  }
  b.line(
    geometry.femoralHeadCircles[0].center,
    geometry.femoralHeadCircles[1].center
  );
  const interaction = b.context.effectiveCfhInteractionState ?? 'idle';
  const color =
    interaction === 'selected'
      ? '#ef4444'
      : interaction === 'hovered'
        ? '#fbbf24'
        : 'currentColor';
  b.dot(
    geometry.femoralHeadCenter,
    {
      fill: color,
      stroke: '#ffffff',
      strokeWidth: interaction === 'idle' ? 1 : 2,
    },
    interaction === 'selected' ? 6 : interaction === 'hovered' ? 7 : 4
  );
  const center = b.project(geometry.femoralHeadCenter);
  b.primitives.push({
    kind: 'text',
    point: { x: center.x + 8, y: center.y - 8 },
    text: 'CFH',
    fontSize: 12,
    fill: color,
  });
}

export function buildPelvicDrawing(
  type: 'pi' | 'pt' | 'tpa',
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  const b = new DrawingBuilder(context);
  const resolved =
    context.resolvedMeasurement?.kind === 'pelvic'
      ? context.resolvedMeasurement
      : null;
  const fallback = type === 'tpa' && !resolved ? getTpaGeometry(points) : null;
  const geometry =
    resolved?.geometry ??
    getPelvicMeasurementGeometry(fallback?.pelvicPoints ?? points);
  if (!geometry || (type === 'tpa' && !resolved && !fallback)) return [];
  addPelvicSharedGeometry(b, geometry);
  const sacral = b.project(geometry.sacralMidpoint);
  const femoral = geometry.femoralHeadCenter
    ? b.project(geometry.femoralHeadCenter)
    : null;
  if (type === 'pi') {
    const normal = geometry.sacralNormal,
      mid = geometry.sacralMidpoint;
    const a = {
      x: mid.x - normal.x * lengths.pelvicNormalLength,
      y: mid.y - normal.y * lengths.pelvicNormalLength,
    };
    const c = {
      x: mid.x + normal.x * lengths.pelvicNormalLength,
      y: mid.y + normal.y * lengths.pelvicNormalLength,
    };
    b.line(geometry.sacralLeft, geometry.sacralRight);
    b.line(a, c);
    b.dot(mid);
    if (femoral && geometry.femoralHeadCenter) {
      b.line(geometry.femoralHeadCenter, mid);
      const ray = angle(sacral, femoral);
      b.arc(
        sacral,
        closestRay(ray, [
          angle(sacral, b.project(c)),
          angle(sacral, b.project(a)),
        ]),
        ray,
        pelvicArcRadius(
          distance(sacral, femoral),
          distance(sacral, b.project(c)),
          false
        )
      );
    }
  } else if (type === 'pt' && femoral && geometry.femoralHeadCenter) {
    const center = geometry.femoralHeadCenter;
    const top = { x: center.x, y: center.y - lengths.pelvicVerticalHalfLength };
    const bottom = {
      x: center.x,
      y: center.y + lengths.pelvicVerticalHalfLength,
    };
    b.line(top, bottom, {
      stroke: '#00ff00',
      strokeWidth: 1,
      dash: '5,5',
      opacity: 0.7,
    });
    b.line(center, geometry.sacralMidpoint, { dash: '3,3' });
    const ray = angle(femoral, sacral);
    b.arc(
      femoral,
      closestRay(ray, [-90, 90]),
      ray,
      pelvicArcRadius(
        distance(femoral, sacral),
        Math.abs(b.project(bottom).y - femoral.y),
        true
      )
    );
  } else if (type === 'tpa' && femoral && geometry.femoralHeadCenter) {
    const t1Points = resolved?.t1Points ?? points.slice(0, 4);
    if (!t1Points || t1Points.length !== 4) return [];
    const center = b.vertebra(t1Points, 0.3);
    b.line(center, geometry.femoralHeadCenter, { dash: '3,3' });
    b.line(geometry.femoralHeadCenter, geometry.sacralMidpoint, {
      dash: '3,3',
    });
    b.line(geometry.sacralLeft, geometry.sacralRight, {
      strokeWidth: 1,
      dash: '5,5',
      opacity: 0.5,
    });
    b.arc(
      femoral,
      angle(femoral, b.project(center)),
      angle(femoral, sacral),
      screen.tpaArcRadius
    );
  }
  return b.primitives;
}

export function buildSsDrawing(
  points: Point[],
  context: DrawingContext = {}
): DrawingPrimitive[] {
  const geometry = getPelvicMeasurementGeometry(points);
  if (!geometry) return [];
  const b = new DrawingBuilder(context);
  const vertex =
    geometry.sacralRight.x >= geometry.sacralLeft.x
      ? geometry.sacralRight
      : geometry.sacralLeft;
  const opposite =
    vertex === geometry.sacralRight
      ? geometry.sacralLeft
      : geometry.sacralRight;
  const length = distance(vertex, opposite);
  if (!length) return [];
  const unit = {
    x: (vertex.x - opposite.x) / length,
    y: (vertex.y - opposite.y) / length,
  };
  b.line(geometry.sacralLeft, geometry.sacralRight);
  b.line(
    { x: vertex.x - lengths.pelvicReferenceHalfWidth, y: vertex.y },
    { x: vertex.x + lengths.pelvicReferenceHalfWidth, y: vertex.y },
    { stroke: '#00ff00', strokeWidth: 1, dash: '5,5', opacity: 0.7 }
  );
  b.line(
    vertex,
    {
      x: vertex.x + unit.x * lengths.ssReverseGuideLength,
      y: vertex.y + unit.y * lengths.ssReverseGuideLength,
    },
    { strokeWidth: 1, dash: '3,3', opacity: 0.8 }
  );
  b.arc(
    b.project(vertex),
    unit.x < 0 ? 180 : 0,
    angle(b.project(opposite), b.project(vertex)),
    screen.ssArcRadius,
    { opacity: 0.85 }
  );
  b.dot(vertex);
  return b.primitives;
}
