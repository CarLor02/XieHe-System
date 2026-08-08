import {
  type KeypointAnnotation,
  upsertKeypoint,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  isAnteriorExamType,
  isBendingExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/shared/domain/exam-type';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  AnnotationSource,
  type MeasurementData,
  type Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  resolveEffectiveCfh,
  resolvePelvicMeasurement,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';

import {
  AP_MEASUREMENT_KEYPOINT_BINDING_RULES,
  HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS,
} from './ap-binding-rules';
import { getAvtMeasurementKeypointBindingRule } from './avt-binding-rule';
import type { MeasurementKeypointBindingRule } from './binding-rule-types';
import { LATERAL_MEASUREMENT_KEYPOINT_BINDING_RULES } from './lateral-binding-rules';
import { getPelvicMeasurementKeypointBindingRule } from './pelvic-binding-rule';

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

export function getMeasurementKeypointBindingRuleForMeasurement(
  measurement: MeasurementData
): MeasurementKeypointBindingRule | null {
  return (
    getAvtMeasurementKeypointBindingRule(measurement) ??
    getPelvicMeasurementKeypointBindingRule(measurement) ??
    getMeasurementKeypointBindingRule(measurement.type)
  );
}

export function buildBoundMeasurementPointsForMeasurement(
  measurement: MeasurementData,
  keypoints: KeypointAnnotation[]
): Point[] | null {
  const rule = getMeasurementKeypointBindingRuleForMeasurement(measurement);
  if (!rule) return null;
  return rule.buildMeasurementPoints(
    new Map(keypoints.map(keypoint => [keypoint.id, keypoint])),
    measurement.points
  );
}

export function getAutoDeriveMeasurementKeypointBindingRules(
  examType: string
): MeasurementKeypointBindingRule[] {
  // 曲位只允许显式创建 Cobb，不能因复用 AP 角点而派生 T1 Tilt、CA 等正位测量。
  if (isBendingExamType(examType)) return [];

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

/** 返回手动工具可从当前关键点继承的 measurement 点位。 */
export function getAvailableBoundMeasurementPointMap(
  measurementType: string,
  keypoints: KeypointAnnotation[]
): Map<number, Point> {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  if (!rule) return new Map();
  return rule.getAvailableMeasurementPointMap(
    new Map(keypoints.map(keypoint => [keypoint.id, keypoint]))
  );
}

export function getMissingBoundKeypointIds(
  measurementType: string,
  keypoints: KeypointAnnotation[]
): string[] {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  if (!rule) return [];
  const existingIds = new Set(keypoints.map(keypoint => keypoint.id));
  return rule.requiredKeypointIds.filter(
    keypointId => !existingIds.has(keypointId)
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

export function writeMeasurementToKeypoints(
  keypoints: KeypointAnnotation[],
  measurement: MeasurementData,
  points: Point[],
  changedPointIndex?: number
): KeypointAnnotation[] {
  const rule = getMeasurementKeypointBindingRuleForMeasurement(measurement);
  if (!rule) return keypoints;

  let currentKeypoints = keypoints;
  const resolvedPelvicMeasurement = resolvePelvicMeasurement(measurement);
  if (
    resolvedPelvicMeasurement?.toolId === 'tpa' &&
    resolvedPelvicMeasurement.layout === 'legacy-bilateral-effective-cfh' &&
    changedPointIndex === 4 &&
    points[4]
  ) {
    const byId = new Map(
      keypoints.map(keypoint => [keypoint.id, keypoint.point])
    );
    const effective = resolveEffectiveCfh(byId, 'bilateral');
    if (effective.status === 'ready') {
      const delta = {
        x: points[4].x - effective.point.x,
        y: points[4].y - effective.point.y,
      };
      // 历史双 FH 七点 TPA 只保存 effectiveCFH 中点。拖动该点时必须平移两个
      // 真实圆心，不能创建虚假的 CFH；新十点 TPA 直接写回 FH-1/FH-2。
      for (const keypointId of effective.dependencyIds) {
        const keypoint = keypoints.find(item => item.id === keypointId);
        if (!keypoint) continue;
        currentKeypoints = upsertKeypoint(currentKeypoints, {
          ...keypoint,
          point: {
            x: keypoint.point.x + delta.x,
            y: keypoint.point.y + delta.y,
          },
          source: AnnotationSource.MANUAL,
        });
      }
    }
  }

  return rule.getKeypointUpdates(points, changedPointIndex).reduce(
    (current, update) =>
      upsertKeypoint(current, {
        id: update.keypointId,
        point: { ...update.point },
        source: AnnotationSource.MANUAL,
        confidence: 1,
      }),
    currentKeypoints
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
    const rule = getMeasurementKeypointBindingRuleForMeasurement(measurement);
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
