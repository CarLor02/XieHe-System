/**
 * 几何计算工具函数
 * 提供点、线、图形等几何计算功能
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * 计算两点之间的欧几里得距离
 */
export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * 计算点到线段的最短距离
 * @param point 目标点
 * @param lineStart 线段起点
 * @param lineEnd 线段终点
 * @returns 点到线段的最短距离
 */
export function pointToLineDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // 线段退化为点
    return calculateDistance(point, lineStart);
  }

  // 计算投影参数t (0 <= t <= 1表示投影点在线段上)
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t)); // 限制在线段范围内

  // 计算投影点
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return calculateDistance(point, { x: projX, y: projY });
}

/**
 * 检查点是否在边界框内
 * @param point 目标点
 * @param points 构成边界框的点集
 * @param padding 边界框的内边距
 * @returns 是否在边界框内
 */
export function isPointInBounds(
  point: Point,
  points: Point[],
  padding: number = 0
): boolean {
  if (points.length === 0) return false;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return (
    point.x >= minX - padding &&
    point.x <= maxX + padding &&
    point.y >= minY - padding &&
    point.y <= maxY + padding
  );
}

/**
 * 计算点集的边界框
 * @param points 点集
 * @returns 边界框 {minX, maxX, minY, maxY}
 */
export function getBoundingBox(points: Point[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * 计算点集的中心点
 * @param points 点集
 * @returns 中心点坐标
 */
export function getCenterPoint(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const bbox = getBoundingBox(points);
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2,
  };
}

/**
 * 检查点是否在矩形内
 * @param point 目标点
 * @param rectStart 矩形起点
 * @param rectEnd 矩形终点
 * @returns 是否在矩形内
 */
export function isPointInRectangle(
  point: Point,
  rectStart: Point,
  rectEnd: Point
): boolean {
  const minX = Math.min(rectStart.x, rectEnd.x);
  const maxX = Math.max(rectStart.x, rectEnd.x);
  const minY = Math.min(rectStart.y, rectEnd.y);
  const maxY = Math.max(rectStart.y, rectEnd.y);

  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

/**
 * 检查点是否在圆内或圆边界附近
 * @param point 目标点
 * @param center 圆心
 * @param radius 半径
 * @param tolerance 容差（用于检测边界）
 * @returns 是否在圆内或边界附近
 */
export function isPointNearCircle(
  point: Point,
  center: Point,
  radius: number,
  tolerance: number = 0
): boolean {
  const distance = calculateDistance(point, center);
  return Math.abs(distance - radius) <= tolerance;
}

/**
 * 检查点是否在椭圆边界附近
 * @param point 目标点
 * @param center 椭圆中心
 * @param radiusX X轴半径
 * @param radiusY Y轴半径
 * @param tolerance 容差
 * @returns 是否在椭圆边界附近
 */
export function isPointNearEllipse(
  point: Point,
  center: Point,
  radiusX: number,
  radiusY: number,
  tolerance: number = 0
): boolean {
  if (radiusX === 0 || radiusY === 0) return false;

  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const normalizedDist = Math.sqrt(
    Math.pow(dx / radiusX, 2) + Math.pow(dy / radiusY, 2)
  );

  return Math.abs(normalizedDist - 1) <= tolerance / Math.min(radiusX, radiusY);
}

/**
 * 计算四边形的质心（几何中心）
 * 使用四个顶点坐标的平均值
 * @param points 四个顶点坐标（按顺序）
 * @returns 质心坐标
 */
export function calculateQuadrilateralCenter(points: Point[]): Point {
  if (points.length !== 4) {
    console.warn('calculateQuadrilateralCenter: 需要4个点，当前有', points.length, '个点');
    // 如果点数不足4个，返回已有点的平均值
    if (points.length === 0) return { x: 0, y: 0 };
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  // 计算四个点的平均坐标（质心）
  const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
  const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

  return { x: centerX, y: centerY };
}

