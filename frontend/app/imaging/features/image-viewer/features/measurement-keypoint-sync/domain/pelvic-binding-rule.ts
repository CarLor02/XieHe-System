import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  BILATERAL_PELVIC_POINT_COUNT,
  createDefaultBilateralPelvicPoints,
  createPelvicMeasurementMetadata,
  isPelvicMeasurementMetadata,
  resolveEffectiveCfh,
  updatePelvicMeasurementPoint,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type {
  FemoralHeadMode,
  PelvicMeasurementMetadata,
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
  const normalizePoints = composePointNormalizers(
    points => normalizeCornerGroups(points, [[0, 1, 2, 3]]),
    points => normalizePointPairs(points, [[5, 6]])
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
        ...(mode === 'single' ? ([[4, 'CFH']] as const) : []),
        [5, 'S1-1'],
        [6, 'S1-2'],
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
    buildMeasurementPoints: byId => {
      const pointsById = clonePointMap(byId);
      const effective = resolveEffectiveCfh(pointsById, mode);
      const points = [
        ...T1_IDS.map(id => pointsById.get(id)),
        effective.status === 'ready' ? effective.point : undefined,
        pointsById.get('S1-1'),
        pointsById.get('S1-2'),
      ];
      if (points.some(point => !point)) return null;
      return normalizePoints(points as Point[]).points;
    },
    getAvailableMeasurementPointMap: byId => {
      const available = new Map<number, Point>();
      T1_IDS.forEach((id, pointIndex) => {
        const keypoint = byId.get(id);
        if (keypoint) available.set(pointIndex, { ...keypoint.point });
      });
      const effective = resolveEffectiveCfh(clonePointMap(byId), mode);
      if (effective.status === 'ready') available.set(4, effective.point);
      const s1First = byId.get('S1-1');
      const s1Second = byId.get('S1-2');
      if (s1First) available.set(5, { ...s1First.point });
      if (s1Second) available.set(6, { ...s1Second.point });
      return available;
    },
    getDrawingHint: pointIndex => {
      if (pointIndex >= 0 && pointIndex <= 3) {
        return `T1 四角待排序点 ${pointIndex + 1}/4`;
      }
      if (pointIndex === 4) {
        return mode === 'bilateral' ? 'effectiveCFH（由FH-1/FH-2确定）' : 'CFH';
      }
      if (pointIndex === 5) return 'S1-1';
      if (pointIndex === 6) return 'S1-2';
      return null;
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

/** 双 FH PI/PT 圆心拖动时同步平移半径控制点。 */
export function normalizePelvicDraggedMeasurementPoints(
  measurement: MeasurementData,
  points: Point[],
  changedPointIndex: number
): Point[] {
  const typeId = getAnnotationTypeId(measurement.type);
  if (
    (typeId !== 'pi' && typeId !== 'pt') ||
    getPelvicMeasurementMode(measurement) !== 'bilateral'
  ) {
    return points;
  }
  return updatePelvicMeasurementPoint(
    measurement.points,
    changedPointIndex,
    points[changedPointIndex]
  );
}
