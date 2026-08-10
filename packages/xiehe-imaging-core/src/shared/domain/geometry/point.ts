import type { Point } from '../contracts';

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 手动测量工具共享的纯几何规则。
 *
 * 这些函数不理解具体工具名称，也不依赖 catalog、React 或画布状态。
 */
export function calculateDistance2D(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/** 将点吸附到经过 anchor 的水平线上，仅保留原始点的 X 坐标。 */
export function constrainPointHorizontally(
  point: Point,
  anchor: Point
): Point {
  return { x: point.x, y: anchor.y };
}

/** 将点吸附到经过 anchor 的垂直线上，仅保留原始点的 Y 坐标。 */
export function constrainPointVertically(point: Point, anchor: Point): Point {
  return { x: anchor.x, y: point.y };
}

export function pointToLineDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return calculateDistance2D(point, lineStart);
  }

  const projectionRatio = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        lengthSquared
    )
  );
  return calculateDistance2D(point, {
    x: lineStart.x + projectionRatio * dx,
    y: lineStart.y + projectionRatio * dy,
  });
}

export function calculateAngleBetweenVectors(v1: Point, v2: Point): number {
  const magnitude1 = Math.hypot(v1.x, v1.y);
  const magnitude2 = Math.hypot(v2.x, v2.y);
  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  const cosine = (v1.x * v2.x + v1.y * v2.y) / (magnitude1 * magnitude2);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * (180 / Math.PI);
}

/**
 * 返回线段相对水平方向的有符号锐角，范围为 [-90, 90]。
 * 点位顺序决定正负号，因此各工具必须在自己的领域模块中明确点序语义。
 */
export function calculateAngleToHorizontal(p1: Point, p2: Point): number {
  let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
}

export function calculateCenterPoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

export function getBoundingBox(points: readonly Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  return points.reduce<BoundingBox>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: points[0].x,
      maxX: points[0].x,
      minY: points[0].y,
      maxY: points[0].y,
    }
  );
}

/** 返回通用点集的算术中心；椎体中心应使用 getVertebraCenterGeometry。 */
export function calculatePointsCentroid(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

export function toAcuteAngle(angle: number): number {
  return angle > 90 ? 180 - angle : angle;
}
