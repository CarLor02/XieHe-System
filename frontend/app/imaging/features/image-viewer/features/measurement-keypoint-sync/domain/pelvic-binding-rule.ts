import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  BILATERAL_PELVIC_POINT_COUNT,
  createDefaultBilateralPelvicPoints,
  createPelvicMeasurementMetadata,
  extractBilateralPelvicPoints,
  getBilateralPelvicPointIndex,
  getPelvicToolPointLabels,
  isPelvicMeasurementMetadata,
  replaceBilateralPelvicPoints,
  resolveEffectiveCfh,
  updatePelvicMeasurementPoint,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type {
  FemoralHeadMode,
  PelvicMeasurementMetadata,
  PelvicToolId,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import {
  circleGeometryFromPoints,
  moveCircleCenter,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/circle';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

import type {
  MeasurementKeypointBindingRule,
  MeasurementKeypointUpdate,
} from './binding-rule-types';
import {
  composePointNormalizers,
  normalizeCornerGroups,
  normalizePointPairs,
} from './point-normalization';

const SINGLE_REQUIRED_IDS = ['CFH', 'S1-1', 'S1-2'] as const;
const BILATERAL_REQUIRED_IDS = ['FH-1', 'FH-2', 'S1-1', 'S1-2'] as const;
const T1_IDS = ['T1-1', 'T1-2', 'T1-3', 'T1-4'] as const;

function clonePointMap(byId: Map<string, KeypointAnnotation>): Map<string, Point> {
  return new Map(
    Array.from(byId, ([keypointId, keypoint]) => [
      keypointId,
      { ...keypoint.point },
    ])
  );
}

/**
 * 历史 PI/PT/TPA 没有 pelvicMetadata，且其 CFH 一定来自旧三点契约。
 * 因此无 metadata 时必须固定按单 FH 读取，不能根据当前关键点集合猜测模式。
 */
export function getPelvicMeasurementMode(
  measurement: MeasurementData
): FemoralHeadMode {
  return isPelvicMeasurementMetadata(measurement.pelvicMetadata)
    ? measurement.pelvicMetadata.femoralHeadMode
    : 'single';
}

export function getPelvicMetadataForMode(
  mode: FemoralHeadMode
): PelvicMeasurementMetadata {
  return createPelvicMeasurementMetadata(mode);
}

function normalizePelvicPoints(mode: FemoralHeadMode, points: Point[]) {
  if (mode === 'bilateral') {
    return normalizePointPairs(points, [[4, 5]]);
  }
  return normalizePointPairs(points, [[1, 2]]);
}

function pelvicDrawingHint(mode: FemoralHeadMode, pointIndex: number): string | null {
  const labels =
    mode === 'bilateral'
      ? ['FH-1圆心', 'FH-1半径点', 'FH-2圆心', 'FH-2半径点', 'S1-1', 'S1-2']
      : ['CFH', 'S1-1', 'S1-2'];
  return labels[pointIndex] ?? null;
}

function getPelvicUpdates(
  mode: FemoralHeadMode,
  points: Point[],
  changedPointIndex?: number
): MeasurementKeypointUpdate[] {
  const normalized = normalizePelvicPoints(mode, points);
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

  return slots.flatMap(([pointIndex, keypointId]) => {
    const sourceIndex = normalized.sourceIndices[pointIndex];
    const point = normalized.points[pointIndex];
    if (!point || (changedPointIndex !== undefined && sourceIndex !== changedPointIndex)) {
      return [];
    }
    return [{ keypointId, point: { ...point } }];
  });
}

function buildPelvicPoints(
  mode: FemoralHeadMode,
  byId: Map<string, KeypointAnnotation>,
  existingPoints?: Point[]
): Point[] | null {
  const pointsById = clonePointMap(byId);
  const effective = resolveEffectiveCfh(pointsById, mode);
  const s1First = pointsById.get('S1-1');
  const s1Second = pointsById.get('S1-2');
  if (effective.status !== 'ready' || !s1First || !s1Second) return null;

  if (mode === 'single') {
    return normalizePelvicPoints(mode, [
      effective.point,
      s1First,
      s1Second,
    ]).points;
  }

  const fh1 = pointsById.get('FH-1')!;
  const fh2 = pointsById.get('FH-2')!;
  if (existingPoints?.length === BILATERAL_PELVIC_POINT_COUNT) {
    const firstCircle = circleGeometryFromPoints(existingPoints, 0, 1);
    const secondCircle = circleGeometryFromPoints(existingPoints, 2, 3);
    if (firstCircle && secondCircle) {
      const movedFirst = moveCircleCenter(firstCircle, fh1);
      const movedSecond = moveCircleCenter(secondCircle, fh2);
      return normalizePelvicPoints(mode, [
        movedFirst.center,
        movedFirst.radiusHandle,
        movedSecond.center,
        movedSecond.radiusHandle,
        s1First,
        s1Second,
      ]).points;
    }
  }

  return normalizePelvicPoints(
    mode,
    createDefaultBilateralPelvicPoints({
      fh1,
      fh2,
      s1First,
      s1Second,
      imageSize: null,
    })
  ).points;
}

function createPelvicBindingRule(
  measurement: MeasurementData,
  mode: FemoralHeadMode
): MeasurementKeypointBindingRule {
  return {
    typeId: getAnnotationTypeId(measurement.type),
    examView: 'lateral',
    requiredKeypointIds:
      mode === 'bilateral' ? BILATERAL_REQUIRED_IDS : SINGLE_REQUIRED_IDS,
    autoDerive: true,
    normalizePoints: points => normalizePelvicPoints(mode, points),
    getKeypointUpdates: (points, changedPointIndex) =>
      getPelvicUpdates(mode, points, changedPointIndex),
    buildMeasurementPoints: (byId, existingPoints) =>
      buildPelvicPoints(mode, byId, existingPoints),
    getAvailableMeasurementPointMap: byId => {
      const available = new Map<number, Point>();
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
        const keypoint = byId.get(keypointId);
        if (keypoint) available.set(pointIndex, { ...keypoint.point });
      });
      return available;
    },
    getDrawingHint: pointIndex => pelvicDrawingHint(mode, pointIndex),
  };
}

function createTpaBindingRule(
  measurement: MeasurementData,
  mode: FemoralHeadMode
): MeasurementKeypointBindingRule {
  // 旧版本曾保存带 bilateral metadata 的七点 TPA，其中点 4 是 effectiveCFH。
  // 新双 FH TPA 使用十点结构；旧记录必须保持七点解释，不能迁移下标。
  const isLegacyBilateralLayout =
    mode === 'bilateral' && measurement.points.length === 7;
  const normalizePoints = composePointNormalizers(
    points => normalizeCornerGroups(points, [[0, 1, 2, 3]]),
    points =>
      normalizePointPairs(points, [
        mode === 'bilateral' && !isLegacyBilateralLayout ? [8, 9] : [5, 6],
      ])
  );
  return {
    typeId: 'tpa',
    examView: 'lateral',
    requiredKeypointIds: [
      ...T1_IDS,
      ...(mode === 'bilateral' ? ['FH-1', 'FH-2'] : ['CFH']),
      'S1-1',
      'S1-2',
    ],
    autoDerive: true,
    normalizePoints,
    getKeypointUpdates: (points, changedPointIndex) => {
      const normalized = normalizePoints(points);
      const slots = [
        [0, 'T1-1'],
        [1, 'T1-2'],
        [2, 'T1-3'],
        [3, 'T1-4'],
        ...(mode === 'single'
          ? ([[4, 'CFH'], [5, 'S1-1'], [6, 'S1-2']] as const)
          : isLegacyBilateralLayout
            ? ([[5, 'S1-1'], [6, 'S1-2']] as const)
            : ([[4, 'FH-1'], [6, 'FH-2'], [8, 'S1-1'], [9, 'S1-2']] as const)),
      ] as const;
      return slots.flatMap(([pointIndex, keypointId]) => {
        const sourceIndex = normalized.sourceIndices[pointIndex];
        const point = normalized.points[pointIndex];
        if (!point || (changedPointIndex !== undefined && sourceIndex !== changedPointIndex)) {
          return [];
        }
        return [{ keypointId, point: { ...point } }];
      });
    },
    buildMeasurementPoints: (byId, existingPoints) => {
      const pointsById = clonePointMap(byId);
      const t1Points = T1_IDS.map(id => pointsById.get(id));
      if (t1Points.some(point => !point)) return null;
      if (isLegacyBilateralLayout) {
        const effective = resolveEffectiveCfh(pointsById, 'bilateral');
        const s1First = pointsById.get('S1-1');
        const s1Second = pointsById.get('S1-2');
        if (effective.status !== 'ready' || !s1First || !s1Second) return null;
        return normalizePoints([
          ...(t1Points as Point[]),
          effective.point,
          s1First,
          s1Second,
        ]).points;
      }
      const existingPelvicPoints = existingPoints
        ? (extractBilateralPelvicPoints('tpa', existingPoints) ?? undefined)
        : undefined;
      const pelvicPoints = buildPelvicPoints(
        mode,
        byId,
        existingPelvicPoints
      );
      if (!pelvicPoints) return null;
      return normalizePoints([
        ...(t1Points as Point[]),
        ...pelvicPoints,
      ]).points;
    },
    getAvailableMeasurementPointMap: byId => {
      const available = new Map<number, Point>();
      T1_IDS.forEach((id, pointIndex) => {
        const keypoint = byId.get(id);
        if (keypoint) available.set(pointIndex, { ...keypoint.point });
      });
      const pointSlots =
        mode === 'bilateral' && !isLegacyBilateralLayout
          ? ([
              [4, 'FH-1'],
              [6, 'FH-2'],
              [8, 'S1-1'],
              [9, 'S1-2'],
            ] as const)
          : mode === 'single'
            ? ([
                [4, 'CFH'],
                [5, 'S1-1'],
                [6, 'S1-2'],
              ] as const)
            : ([
                [5, 'S1-1'],
                [6, 'S1-2'],
              ] as const);
      pointSlots.forEach(([pointIndex, keypointId]) => {
        const keypoint = byId.get(keypointId);
        if (keypoint) available.set(pointIndex, { ...keypoint.point });
      });
      if (mode === 'bilateral' && !isLegacyBilateralLayout) {
        const existingPelvicPoints = extractBilateralPelvicPoints(
          'tpa',
          measurement.points
        );
        if (existingPelvicPoints) {
          available.set(5, { ...existingPelvicPoints[1] });
          available.set(7, { ...existingPelvicPoints[3] });
        }
      }
      return available;
    },
    getDrawingHint: pointIndex => {
      if (isLegacyBilateralLayout) {
        return [
          'T1-1',
          'T1-2',
          'T1-3',
          'T1-4',
          'effectiveCFH（由FH-1/FH-2确定）',
          'S1-1',
          'S1-2',
        ][pointIndex] ?? null;
      }
      return getPelvicToolPointLabels('tpa', mode)[pointIndex] ?? null;
    },
  };
}

export function getPelvicMeasurementKeypointBindingRule(
  measurement: MeasurementData
): MeasurementKeypointBindingRule | null {
  const typeId = getAnnotationTypeId(measurement.type);
  if (typeId !== 'pi' && typeId !== 'pt' && typeId !== 'tpa') return null;
  const mode = getPelvicMeasurementMode(measurement);
  return typeId === 'tpa'
    ? createTpaBindingRule(measurement, mode)
    : createPelvicBindingRule(measurement, mode);
}

/** 双 FH PI/PT/TPA 圆心拖动时同步平移对应半径控制点。 */
export function normalizePelvicDraggedMeasurementPoints(
  measurement: MeasurementData,
  points: Point[],
  changedPointIndex: number
): Point[] {
  const typeId = getAnnotationTypeId(measurement.type);
  if (
    (typeId !== 'pi' && typeId !== 'pt' && typeId !== 'tpa') ||
    getPelvicMeasurementMode(measurement) !== 'bilateral'
  ) {
    return points;
  }
  const toolId = typeId as PelvicToolId;
  const pelvicPoints = extractBilateralPelvicPoints(toolId, measurement.points);
  const pelvicPointIndex = getBilateralPelvicPointIndex(
    toolId,
    changedPointIndex
  );
  if (!pelvicPoints || pelvicPointIndex === null) return points;
  const updatedPelvicPoints = updatePelvicMeasurementPoint(
    pelvicPoints,
    pelvicPointIndex,
    points[changedPointIndex]
  );
  return replaceBilateralPelvicPoints(toolId, points, updatedPelvicPoints);
}
