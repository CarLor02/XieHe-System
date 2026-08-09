import type { Point } from '../../contracts';

/** 圆形领域模型：圆心与任意一个圆周控制点共同确定圆。 */
export interface CircleGeometry {
  center: Point;
  radiusHandle: Point;
}

export interface CircleBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
