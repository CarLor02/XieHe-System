import type { MeasurementResult } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * 计算两条终板线之间的 Cobb 角。
 *
 * 四点顺序固定为 [第一终板起点, 第一终板终点, 第二终板起点, 第二终板终点]。
 * 正侧位对“哪些关键点组成终板”的选择不同，但在进入本函数前都必须先完成点序适配。
 */
export function calculateCobbResults(points: Point[]): MeasurementResult[] {
  if (points.length < 4) return [];

  const angle1 = Math.atan2(
    points[1].y - points[0].y,
    points[1].x - points[0].x
  );
  const angle2 = Math.atan2(
    points[3].y - points[2].y,
    points[3].x - points[2].x
  );

  let angleDifference = Math.abs(angle2 - angle1) * (180 / Math.PI);
  if (angleDifference > 180) {
    angleDifference = 360 - angleDifference;
  }

  // 保留既有符号约定：图像左侧两端点的纵向跨度更大时记为负值。
  const leftDistance = Math.abs(points[2].y - points[0].y);
  const rightDistance = Math.abs(points[3].y - points[1].y);
  const signedAngle =
    leftDistance > rightDistance ? -angleDifference : angleDifference;

  return [
    {
      name: 'Cobb角',
      value: signedAngle.toFixed(2),
      unit: '°',
    },
  ];
}
