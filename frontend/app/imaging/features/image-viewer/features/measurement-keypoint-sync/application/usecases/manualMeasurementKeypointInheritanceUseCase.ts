import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { Point } from '@xiehe/imaging-core/contracts';

import { getAvailableBoundMeasurementPointMap } from '../../domain/measurement-keypoint-binding';

export function getManualMeasurementInheritedPointMap(
  toolId: string,
  pointsNeeded: number,
  keypoints: KeypointAnnotation[]
): Map<number, Point> {
  return new Map(
    Array.from(getAvailableBoundMeasurementPointMap(toolId, keypoints)).filter(
      ([pointIndex]) => pointIndex >= 0 && pointIndex < pointsNeeded
    )
  );
}

export function getManualMeasurementInheritedPoints(
  toolId: string,
  pointsNeeded: number,
  keypoints: KeypointAnnotation[]
): { points: Point[]; count: number } {
  const inherited = getManualMeasurementInheritedPointMap(
    toolId,
    pointsNeeded,
    keypoints
  );
  const sorted = Array.from(inherited.entries()).sort(
    (left, right) => left[0] - right[0]
  );
  return { points: sorted.map(([, point]) => point), count: sorted.length };
}

/** 返回第 currentManualPointIndex 次点击对应的 measurement.points 索引。 */
export function getNextManualMeasurementPointIndex(
  toolId: string,
  keypoints: KeypointAnnotation[],
  pointsNeeded: number,
  currentManualPointIndex: number
): number | null {
  const inherited = getManualMeasurementInheritedPointMap(
    toolId,
    pointsNeeded,
    keypoints
  );
  const missingIndices = Array.from({ length: pointsNeeded }, (_, index) =>
    inherited.has(index) ? null : index
  ).filter((index): index is number => index !== null);
  return missingIndices[currentManualPointIndex] ?? null;
}

export function getEffectiveManualMeasurementPointsNeeded(
  toolId: string,
  totalPointsNeeded: number,
  keypoints: KeypointAnnotation[]
): number {
  return Math.max(
    0,
    totalPointsNeeded -
      getManualMeasurementInheritedPointMap(
        toolId,
        totalPointsNeeded,
        keypoints
      ).size
  );
}
