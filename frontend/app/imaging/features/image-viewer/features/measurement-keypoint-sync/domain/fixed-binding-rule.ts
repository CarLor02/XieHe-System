import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

import type {
  MeasurementKeypointBindingRule,
  MeasurementKeypointExamView,
} from './binding-rule-types';
import {
  keepMeasurementPointOrder,
  type NormalizedMeasurementPoints,
} from './point-normalization';

interface KeypointSlot {
  pointIndex: number;
  keypointId: string;
}

interface CreateFixedBindingRuleOptions {
  typeId: string;
  examView: MeasurementKeypointExamView;
  slots: readonly KeypointSlot[];
  autoDerive?: boolean;
  normalizePoints?: (points: Point[]) => NormalizedMeasurementPoints;
  getDrawingHint?: (pointIndex: number) => string | null;
}

function findNormalizedPointIndex(
  sourceIndices: number[],
  changedPointIndex: number
): number {
  return sourceIndices.findIndex(sourceIndex => sourceIndex === changedPointIndex);
}

export function createFixedBindingRule({
  typeId,
  examView,
  slots,
  autoDerive = true,
  normalizePoints = keepMeasurementPointOrder,
  getDrawingHint,
}: CreateFixedBindingRuleOptions): MeasurementKeypointBindingRule {
  const requiredKeypointIds = Array.from(
    new Set(slots.map(slot => slot.keypointId))
  );

  return {
    typeId,
    examView,
    requiredKeypointIds,
    autoDerive,
    normalizePoints,
    getKeypointUpdates: (points, changedPointIndex) => {
      const normalized = normalizePoints(points);
      const changedNormalizedIndex =
        changedPointIndex === undefined
          ? null
          : findNormalizedPointIndex(
              normalized.sourceIndices,
              changedPointIndex
            );

      return slots
        .filter(
          slot =>
            normalized.points[slot.pointIndex] &&
            (changedNormalizedIndex === null ||
              slot.pointIndex === changedNormalizedIndex)
        )
        .map(slot => ({
          keypointId: slot.keypointId,
          point: normalized.points[slot.pointIndex],
        }));
    },
    buildMeasurementPoints: (
      byId: Map<string, KeypointAnnotation>,
      existingPoints?: Point[]
    ) => {
      const pointCount =
        Math.max(...slots.map(slot => slot.pointIndex), -1) + 1;
      const hasInteractionSlots = slots.length < pointCount;
      if (hasInteractionSlots && (!existingPoints || existingPoints.length < pointCount)) {
        return null;
      }

      const nextPoints = hasInteractionSlots
        ? existingPoints!.map(point => ({ ...point }))
        : Array.from({ length: pointCount }, () => ({ x: 0, y: 0 }));

      for (const slot of slots) {
        const keypoint = byId.get(slot.keypointId);
        if (!keypoint) return null;
        nextPoints[slot.pointIndex] = { ...keypoint.point };
      }

      return normalizePoints(nextPoints).points;
    },
    getAvailableMeasurementPointMap: byId =>
      new Map(
        slots.flatMap(slot => {
          const keypoint = byId.get(slot.keypointId);
          return keypoint
            ? ([[slot.pointIndex, { ...keypoint.point }]] as const)
            : [];
        })
      ),
    getDrawingHint,
  };
}
