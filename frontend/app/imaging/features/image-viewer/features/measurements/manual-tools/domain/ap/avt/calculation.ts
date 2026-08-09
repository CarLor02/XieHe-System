import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import type { MeasurementResult } from '@xiehe/imaging-core/measurements';
import { calculateActualDistance } from '@xiehe/imaging-core/measurements';
import { getAvtGeometry } from './measurement-geometry';

type AvtMeasurementLike = Pick<
  MeasurementData,
  'points' | 'apexVertebra' | 'avtMetadata'
>;

export function calculateAvtValue(
  measurement: AvtMeasurementLike,
  context: CalculationContext
): string | null {
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return null;

  const pixelOffset = geometry.targetCenter.x - geometry.referenceCenter.x;
  const actualDistance = calculateActualDistance(
    Math.abs(pixelOffset),
    context
  );
  const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;
  return `${signedDistance.toFixed(2)}mm`;
}

/**
 * 仅供缺少 AVT metadata 的历史 catalog 路径使用。
 *
 * 当前 AVT 应通过 calculateAvtValue 按 metadata 解析；这里继续兼容旧两点格式和
 * 第一版六点格式，避免已有标注在加载后失去数值。
 */
export function calculateLegacyAvtResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 2) return [];
  const targetX =
    points.length >= 6
      ? points.slice(0, 4).reduce((sum, point) => sum + point.x, 0) / 4
      : points[0].x;
  const referenceX =
    points.length >= 6 ? (points[4].x + points[5].x) / 2 : points[1].x;
  const pixelOffset = targetX - referenceX;
  const distance = calculateActualDistance(Math.abs(pixelOffset), context);
  return [
    {
      name: 'AVT',
      value: (pixelOffset < 0 ? -distance : distance).toFixed(2),
      unit: 'mm',
    },
  ];
}

export function getAvtLabelPosition(measurement: AvtMeasurementLike): Point {
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return measurement.points[0] ?? { x: 0, y: 0 };
  if (geometry.layout === 'legacy-two-point') return geometry.targetCenter;

  return {
    x: Math.max(...geometry.targetPoints.map(point => point.x)),
    y: geometry.targetCenter.y,
  };
}
