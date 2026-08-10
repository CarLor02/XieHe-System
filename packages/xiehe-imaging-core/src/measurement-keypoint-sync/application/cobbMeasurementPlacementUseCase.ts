import type { KeypointAnnotation } from '../../keypoints/domain';
import {
  getLateralCobbPlacementPointIds,
  LATERAL_COBB_PLACEMENT_POINT_COUNT,
  type LateralCobbPlacementSession,
} from '../../measurements/domain/manual-tools/lateral';
import type { Point } from '../../shared/domain/contracts';

export function getLateralCobbPlacementInheritedPointMap({
  session,
  keypoints,
}: {
  session: LateralCobbPlacementSession;
  keypoints: readonly KeypointAnnotation[];
}): Map<number, Point> {
  const keypointsById = new Map(
    keypoints.map(keypoint => [keypoint.id, keypoint.point])
  );
  const inherited = new Map<number, Point>();

  getLateralCobbPlacementPointIds(session).forEach((keypointId, pointIndex) => {
    if (!keypointId) return;
    const point = keypointsById.get(keypointId);
    if (point) inherited.set(pointIndex, { ...point });
  });
  return inherited;
}

export function getNextLateralCobbPlacementPointIndex(
  inherited: ReadonlyMap<number, Point>,
  clickedPointCount: number
): number | null {
  const missingIndices = Array.from(
    { length: LATERAL_COBB_PLACEMENT_POINT_COUNT },
    (_, pointIndex) => (inherited.has(pointIndex) ? null : pointIndex)
  ).filter((pointIndex): pointIndex is number => pointIndex !== null);
  return missingIndices[clickedPointCount] ?? null;
}
