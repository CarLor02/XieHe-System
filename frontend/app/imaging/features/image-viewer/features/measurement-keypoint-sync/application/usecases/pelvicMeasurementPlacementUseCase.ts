import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { FemoralHeadMode } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

export function getPelvicPlacementPointCount(mode: FemoralHeadMode): number {
  return mode === 'bilateral' ? 6 : 3;
}

/**
 * 手动 PI/PT 只继承真实关键点。双 FH 的半径控制点属于测量项自身；只有已有
 * 双 FH PI/PT 时才继承圆半径，避免把领域默认半径伪装成用户已经完成的落点。
 */
export function getPelvicPlacementInheritedPointMap({
  mode,
  keypoints,
  measurements,
}: {
  mode: FemoralHeadMode;
  keypoints: readonly KeypointAnnotation[];
  measurements: readonly Pick<
    MeasurementData,
    'type' | 'points' | 'pelvicMetadata'
  >[];
}): Map<number, Point> {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint.point]));
  const inherited = new Map<number, Point>();
  const slots =
    mode === 'bilateral'
      ? [
          [0, 'FH-1'],
          [2, 'FH-2'],
          [4, 'S1-1'],
          [5, 'S1-2'],
        ] as const
      : [
          [0, 'CFH'],
          [1, 'S1-1'],
          [2, 'S1-2'],
        ] as const;

  slots.forEach(([pointIndex, keypointId]) => {
    const point = byId.get(keypointId);
    if (point) inherited.set(pointIndex, { ...point });
  });

  if (mode === 'bilateral') {
    const existing = measurements.find(measurement => {
      const typeId = getAnnotationTypeId(measurement.type);
      return (
        (typeId === 'pi' || typeId === 'pt') &&
        measurement.pelvicMetadata?.femoralHeadMode === 'bilateral' &&
        measurement.points.length === 6
      );
    });
    if (existing) {
      inherited.set(1, { ...existing.points[1] });
      inherited.set(3, { ...existing.points[3] });
    }
  }

  return inherited;
}

export function getNextPelvicPlacementPointIndex(
  mode: FemoralHeadMode,
  inherited: ReadonlyMap<number, Point>,
  clickedPointCount: number
): number | null {
  const missingIndices = Array.from(
    { length: getPelvicPlacementPointCount(mode) },
    (_, pointIndex) => (inherited.has(pointIndex) ? null : pointIndex)
  ).filter((pointIndex): pointIndex is number => pointIndex !== null);
  return missingIndices[clickedPointCount] ?? null;
}
