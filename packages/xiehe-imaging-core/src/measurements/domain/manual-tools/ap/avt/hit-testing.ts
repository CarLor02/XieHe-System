import type { Point } from '../../../../../shared/domain/contracts';
import { getVertebraCenterGeometry } from '../../../../../shared/domain/geometry';

/**
 * AVT 命中两条垂直参考线。
 *
 * 当前多点布局与历史两点布局都必须保留，旧数据仍会在加载后进入该规则。
 */
export function isAvtInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  if (points.length < 2) return false;
  if (points.length >= 6) {
    const apexCenterX = getVertebraCenterGeometry([
      points[0],
      points[1],
      points[2],
      points[3],
    ]).center.x;
    const referenceX = (points[4].x + points[5].x) / 2;
    return (
      Math.abs(mousePoint.x - apexCenterX) <= tolerance ||
      Math.abs(mousePoint.x - referenceX) <= tolerance
    );
  }

  // 历史兼容：旧 AVT 保存 [顶点中心, 参考线点]。
  return (
    Math.abs(mousePoint.x - points[0].x) <= tolerance ||
    Math.abs(mousePoint.x - points[1].x) <= tolerance
  );
}
