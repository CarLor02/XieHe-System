import type { Point } from '../contracts';

/**
 * 椎体四角点的跨端持久化顺序：左上、右上、左下、右下。
 *
 * 该顺序不是四边形周长顺序；渲染轮廓时必须使用 geometry.perimeter。
 */
export type VertebraCorners = readonly [Point, Point, Point, Point];

export interface VertebraCenterGeometry {
  /** 四边形周长顺序：左上、右上、右下、左下。 */
  perimeter: readonly [Point, Point, Point, Point];
  topMidpoint: Point;
  bottomMidpoint: Point;
  leftMidpoint: Point;
  rightMidpoint: Point;
  /** 上边中点到下边中点的完整连线。 */
  topBottomMidline: readonly [Point, Point];
  /** 左边中点到右边中点的完整连线。 */
  leftRightMidline: readonly [Point, Point];
  /** 两条对边中点连线的交点。 */
  center: Point;
}

function midpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

/**
 * 根据四条边的中点确定椎体中心。
 *
 * 两条对边中点连线互相平分，因此交点可稳定地取任一连线的中点，
 * 无需使用通用直线求交，避免退化图形带来的浮点异常。
 */
export function getVertebraCenterGeometry(
  corners: VertebraCorners
): VertebraCenterGeometry {
  const [topLeft, topRight, bottomLeft, bottomRight] = corners;
  const topMidpoint = midpoint(topLeft, topRight);
  const bottomMidpoint = midpoint(bottomLeft, bottomRight);
  const leftMidpoint = midpoint(topLeft, bottomLeft);
  const rightMidpoint = midpoint(topRight, bottomRight);

  return {
    perimeter: [topLeft, topRight, bottomRight, bottomLeft],
    topMidpoint,
    bottomMidpoint,
    leftMidpoint,
    rightMidpoint,
    topBottomMidline: [topMidpoint, bottomMidpoint],
    leftRightMidline: [leftMidpoint, rightMidpoint],
    center: midpoint(topMidpoint, bottomMidpoint),
  };
}
