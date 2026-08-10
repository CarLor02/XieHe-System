import type { Point } from '../../../shared/domain/contracts';
import {
  applyManualMeasurementPointPlacementConstraint,
  getManualMeasurementPointPlacementConstraint,
  type ManualMeasurementPointPlacementConstraint,
} from '../../domain/manual-measurement-point-placement';

export interface ResolveNextManualMeasurementPointInput {
  toolId: string;
  pointsNeeded: number;
  inheritedPoints: ReadonlyMap<number, Point>;
  clickedPoints: readonly Point[];
  rawPoint: Point;
}

export interface ResolvedManualMeasurementPoint {
  pointIndex: number;
  point: Point;
  constraint: ManualMeasurementPointPlacementConstraint;
}

function getMissingPointIndices(
  pointsNeeded: number,
  inheritedPoints: ReadonlyMap<number, Point>
): number[] {
  return Array.from({ length: pointsNeeded }, (_, index) =>
    inheritedPoints.has(index) ? null : index
  ).filter((index): index is number => index !== null);
}

function mapClickedPointsToMeasurementIndices(
  inheritedPoints: ReadonlyMap<number, Point>,
  missingIndices: readonly number[],
  clickedPoints: readonly Point[]
): Map<number, Point> {
  const pointsByIndex = new Map(inheritedPoints);
  clickedPoints.forEach((point, clickedIndex) => {
    const measurementPointIndex = missingIndices[clickedIndex];
    if (measurementPointIndex !== undefined) {
      pointsByIndex.set(measurementPointIndex, point);
    }
  });
  return pointsByIndex;
}

/**
 * 根据继承槽位和当前点击进度解析下一个手动测量点。
 * 平台只提交原始坐标，工具专属的几何约束由 core domain 统一决定。
 */
export function resolveNextManualMeasurementPoint({
  toolId,
  pointsNeeded,
  inheritedPoints,
  clickedPoints,
  rawPoint,
}: ResolveNextManualMeasurementPointInput): ResolvedManualMeasurementPoint | null {
  const missingIndices = getMissingPointIndices(pointsNeeded, inheritedPoints);
  const pointIndex = missingIndices[clickedPoints.length];
  if (pointIndex === undefined) return null;

  const pointsByIndex = mapClickedPointsToMeasurementIndices(
    inheritedPoints,
    missingIndices,
    clickedPoints
  );
  const constraint = getManualMeasurementPointPlacementConstraint(
    toolId,
    pointIndex
  );

  return {
    pointIndex,
    point: applyManualMeasurementPointPlacementConstraint({
      constraint,
      pointsByIndex,
      rawPoint,
    }),
    constraint,
  };
}
