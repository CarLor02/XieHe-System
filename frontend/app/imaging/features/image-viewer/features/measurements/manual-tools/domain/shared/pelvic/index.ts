import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export interface PelvicMeasurementGeometry {
  femoralHeadCenter: Point | null;
  sacralLeft: Point;
  sacralRight: Point;
  sacralMidpoint: Point;
  sacralNormal: Point;
}

/**
 * 解析侧位骨盆工具共用的股骨头中心、S1 终板中点和终板法线。
 *
 * 三点格式为 [股骨头中心, S1端点1, S1端点2]；两点格式仅表示 S1 终板。
 */
export function getPelvicMeasurementGeometry(
  points: Point[]
): PelvicMeasurementGeometry | null {
  if (points.length < 2) return null;

  const femoralHeadCenter = points.length >= 3 ? points[0] : null;
  const sacralLeft = points.length >= 3 ? points[1] : points[0];
  const sacralRight = points.length >= 3 ? points[2] : points[1];
  const dx = sacralRight.x - sacralLeft.x;
  const dy = sacralRight.y - sacralLeft.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  return {
    femoralHeadCenter,
    sacralLeft,
    sacralRight,
    sacralMidpoint: {
      x: (sacralLeft.x + sacralRight.x) / 2,
      y: (sacralLeft.y + sacralRight.y) / 2,
    },
    sacralNormal: {
      x: -dy / length,
      y: dx / length,
    },
  };
}
