import type { Point } from '../../../../shared/domain/contracts';
import {
  getVertebraCenterGeometry,
  type VertebraCorners,
} from '../../../../shared/domain/geometry';
import type { DrawingContext, DrawingPrimitive, DrawingStyle } from './types';

// 辅助线的长度属于影像坐标；箭头、圆点和角度弧半径属于屏幕坐标。
export const DRAWING_IMAGE_LENGTHS = {
  t1TiltReferenceHalfWidth: 100,
  pelvicNormalLength: 80,
  pelvicVerticalHalfLength: 80,
  pelvicReferenceHalfWidth: 100,
  ssReverseGuideLength: 80,
  verticalGuideLength: 150,
  sacralPerpendicularLength: 300,
  horizontalGuideWidth: 150,
  fallbackGuideLength: 80,
} as const;
export const DRAWING_SCREEN_LENGTHS = {
  t1TiltArcRadius: 30,
  tpaArcRadius: 40,
  ssArcRadius: 24,
  arrowHeadLength: 6,
  arrowHeadHalfHeight: 4,
} as const;
export const identityPoint = (point: Point) => point;
export const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
export const angle = (a: Point, b: Point) =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
export const distance = (a: Point, b: Point) =>
  Math.hypot(b.x - a.x, b.y - a.y);
export function shortestAngle(from: number, to: number) {
  const diff = (((to - from) % 360) + 360) % 360;
  return diff > 180 ? diff - 360 : diff;
}
export function closestRay(base: number, candidates: number[]) {
  return candidates.reduce((best, next) =>
    Math.abs(shortestAngle(base, next)) < Math.abs(shortestAngle(base, best))
      ? next
      : best
  );
}
export function angleArcPath(
  arc: Extract<DrawingPrimitive, { kind: 'arc' }>
): string {
  const { center, radius, startAngle, endAngle } = arc;
  const start = (startAngle * Math.PI) / 180,
    end = (endAngle * Math.PI) / 180;
  return `M ${center.x + radius * Math.cos(start)} ${center.y + radius * Math.sin(start)} A ${radius} ${radius} 0 0 ${shortestAngle(startAngle, endAngle) > 0 ? 1 : 0} ${center.x + radius * Math.cos(end)} ${center.y + radius * Math.sin(end)}`;
}

/** 只组装几何；投影器由平台注入，同一规则同时用于显示和动态位图边界。 */
export class DrawingBuilder {
  readonly primitives: DrawingPrimitive[] = [];
  readonly project: (point: Point) => Point;
  constructor(readonly context: DrawingContext = {}) {
    this.project = context.project ?? identityPoint;
  }
  line(start: Point, end: Point, style: DrawingStyle = {}) {
    this.primitives.push({
      kind: 'line',
      start: this.project(start),
      end: this.project(end),
      ...style,
    });
  }
  dot(center: Point, style: DrawingStyle = {}, radius = 3) {
    this.primitives.push({
      kind: 'circle',
      center: this.project(center),
      radius,
      fill: 'currentColor',
      stroke: 'none',
      ...style,
    });
  }
  arc(
    center: Point,
    startAngle: number,
    endAngle: number,
    radius: number,
    style: DrawingStyle = {}
  ) {
    this.primitives.push({
      kind: 'arc',
      center,
      startAngle,
      endAngle,
      radius,
      strokeWidth: 1.5,
      opacity: 0.8,
      ...style,
    });
  }
  vertebra(
    points: readonly Point[],
    opacity = 0.5,
    centerStroke?: string
  ): Point {
    const geometry = getVertebraCenterGeometry(
      points.slice(0, 4) as unknown as VertebraCorners
    );
    const outline = new DrawingBuilder(this.context);
    const style = { strokeWidth: 1, dash: '5,5', opacity };
    geometry.perimeter.forEach((point, index) =>
      outline.line(point, geometry.perimeter[(index + 1) % 4], {
        ...style,
        part: 'perimeter',
      })
    );
    outline.line(...geometry.topBottomMidline, { ...style, part: 'midline' });
    outline.line(...geometry.leftRightMidline, { ...style, part: 'midline' });
    outline.dot(geometry.center, {
      opacity: Math.min(1, opacity + 0.3),
      part: 'center',
      stroke: centerStroke ?? 'none',
      strokeWidth: centerStroke ? 1 : 0,
    });
    this.primitives.push({ kind: 'vertebra', children: outline.primitives });
    return geometry.center;
  }
  horizontalArrows(start: Point, end: Point) {
    this.line(start, end, { strokeWidth: 1.5 });
    const a = this.project(start),
      b = this.project(end);
    const left = Math.min(a.x, b.x),
      right = Math.max(a.x, b.x);
    const { arrowHeadLength: length, arrowHeadHalfHeight: half } =
      DRAWING_SCREEN_LENGTHS;
    for (const [x, inward] of [
      [left, length],
      [right, -length],
    ]) {
      this.primitives.push({
        kind: 'polygon',
        points: [
          { x, y: a.y },
          { x: x + inward, y: a.y - half },
          { x: x + inward, y: a.y + half },
        ],
        fill: 'currentColor',
        stroke: 'none',
      });
    }
  }
}

export function drawingBoundsPoints(
  primitives: readonly DrawingPrimitive[]
): Point[] {
  return primitives.flatMap(primitive => {
    switch (primitive.kind) {
      case 'line':
        return [primitive.start, primitive.end];
      case 'polygon':
        return primitive.points;
      case 'vertebra':
        return drawingBoundsPoints(primitive.children);
      case 'text':
        return [primitive.point];
      case 'circle':
      case 'arc':
        return [
          {
            x: primitive.center.x - primitive.radius,
            y: primitive.center.y - primitive.radius,
          },
          {
            x: primitive.center.x + primitive.radius,
            y: primitive.center.y + primitive.radius,
          },
        ];
      case 'ellipse':
        return [
          {
            x: primitive.center.x - primitive.rx,
            y: primitive.center.y - primitive.ry,
          },
          {
            x: primitive.center.x + primitive.rx,
            y: primitive.center.y + primitive.ry,
          },
        ];
    }
  });
}
