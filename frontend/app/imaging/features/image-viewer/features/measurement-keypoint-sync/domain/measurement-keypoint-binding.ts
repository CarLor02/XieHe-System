import {
  isAnteriorExamType,
  isLateralExamType,
  type KeypointAnnotation,
  upsertKeypoint,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  AnnotationSource,
  type MeasurementData,
  type Point,
} from '@/app/imaging/features/image-viewer/shared/types';

import {
  AP_MEASUREMENT_KEYPOINT_BINDING_RULES,
  HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS,
} from './ap-binding-rules';
import type { MeasurementKeypointBindingRule } from './binding-rule-types';
import { LATERAL_MEASUREMENT_KEYPOINT_BINDING_RULES } from './lateral-binding-rules';

export { HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS };
export type { MeasurementKeypointBindingRule };

const MEASUREMENT_KEYPOINT_BINDING_RULES = new Map<
  string,
  MeasurementKeypointBindingRule
>(
  [
    ...AP_MEASUREMENT_KEYPOINT_BINDING_RULES,
    ...LATERAL_MEASUREMENT_KEYPOINT_BINDING_RULES,
  ].map(rule => [rule.typeId, rule])
);

function getBindingTypeId(measurementType: string): string {
  const typeId = getAnnotationTypeId(measurementType);
  // 历史派生数据使用 Pelvic/Sacral 作为 PO/CSS 的 type，读取时继续兼容。
  if (typeId === 'pelvic') return 'po';
  if (typeId === 'sacral') return 'css';
  return typeId;
}

export function getMeasurementKeypointBindingRule(
  measurementType: string
): MeasurementKeypointBindingRule | null {
  return (
    MEASUREMENT_KEYPOINT_BINDING_RULES.get(getBindingTypeId(measurementType)) ??
    null
  );
}

export function getAutoDeriveMeasurementKeypointBindingRules(
  examType: string
): MeasurementKeypointBindingRule[] {
  const examView = isLateralExamType(examType)
    ? 'lateral'
    : isAnteriorExamType(examType)
      ? 'ap'
      : null;
  if (!examView) return [];

  return Array.from(MEASUREMENT_KEYPOINT_BINDING_RULES.values()).filter(
    rule => rule.examView === examView && rule.autoDerive
  );
}

export function normalizeBoundMeasurementPoints(
  measurementType: string,
  points: Point[]
): Point[] {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  return rule
    ? rule.normalizePoints(points).points
    : points.map(point => ({ ...point }));
}

export function getMeasurementKeypointDrawingHint(
  measurementType: string,
  pointIndex: number
): string | null {
  return (
    getMeasurementKeypointBindingRule(measurementType)?.getDrawingHint?.(
      pointIndex
    ) ?? null
  );
}

export function buildBoundMeasurementPoints(
  measurementType: string,
  keypoints: KeypointAnnotation[],
  existingPoints?: Point[]
): Point[] | null {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  if (!rule) return null;
  return rule.buildMeasurementPoints(
    new Map(keypoints.map(keypoint => [keypoint.id, keypoint])),
    existingPoints
  );
}

export function writeMeasurementPointsToKeypoints(
  keypoints: KeypointAnnotation[],
  measurementType: string,
  points: Point[],
  changedPointIndex?: number
): KeypointAnnotation[] {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  if (!rule) return keypoints;

  return rule.getKeypointUpdates(points, changedPointIndex).reduce(
    (current, update) =>
      upsertKeypoint(current, {
        id: update.keypointId,
        point: { ...update.point },
        source: AnnotationSource.MANUAL,
        confidence: 1,
      }),
    keypoints
  );
}

/**
 * 兼容历史标注：仅补齐缺失关键点，不覆盖已经存在的关键点。
 * 多个测量项引用同一缺失点时，测量列表中较早的项目优先。
 */
export function backfillMissingBoundKeypoints(
  keypoints: KeypointAnnotation[],
  measurements: MeasurementData[]
): KeypointAnnotation[] {
  let nextKeypoints = keypoints;

  for (const measurement of measurements) {
    const rule = getMeasurementKeypointBindingRule(measurement.type);
    if (!rule) continue;

    const existingIds = new Set(nextKeypoints.map(keypoint => keypoint.id));
    const missingIds = new Set(
      rule.requiredKeypointIds.filter(
        keypointId => !existingIds.has(keypointId)
      )
    );
    if (missingIds.size === 0) continue;

    const updates = rule
      .getKeypointUpdates(measurement.points)
      .filter(update => missingIds.has(update.keypointId));
    for (const update of updates) {
      nextKeypoints = upsertKeypoint(nextKeypoints, {
        id: update.keypointId,
        point: { ...update.point },
        source: AnnotationSource.MANUAL,
        confidence: 1,
      });
    }
  }

  return nextKeypoints;
}
