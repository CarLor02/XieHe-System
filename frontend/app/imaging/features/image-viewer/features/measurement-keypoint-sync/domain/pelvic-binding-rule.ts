import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  BILATERAL_PELVIC_POINT_COUNT,
  createDefaultBilateralPelvicPoints,
  createPelvicMeasurementMetadata,
  getBilateralPelvicPointIndex,
  getPelvicToolPointLabels,
  isPelvicMeasurementMetadata,
  replaceBilateralPelvicPoints,
  resolvePelvicMeasurement,
  resolveEffectiveCfh,
  updatePelvicMeasurementPoint,
} from '@xiehe/imaging-core/measurements/lateral';
import type {
  FemoralHeadMode,
  PelvicMeasurementMetadata,
} from '@xiehe/imaging-core/contracts';
import {
  circleGeometryFromPoints,
  moveCircleCenter,
} from '@xiehe/imaging-core/geometry';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';

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

function clonePointMap(
  byId: Map<string, KeypointAnnotation>
): Map<string, Point> {
  return new Map(
    Array.from(byId, ([keypointId, keypoint]) => [
      keypointId,
      { ...keypoint.point },
    ])
  );
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

function pelvicDrawingHint(
  mode: FemoralHeadMode,
  pointIndex: number
): string | null {
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
      ? ([
          [0, 'FH-1'],
          [2, 'FH-2'],
          [4, 'S1-1'],
          [5, 'S1-2'],
        ] as const)
      : ([
          [0, 'CFH'],
          [1, 'S1-1'],
          [2, 'S1-2'],
        ] as const);

  return slots.flatMap(([pointIndex, keypointId]) => {
    const sourceIndex = normalized.sourceIndices[pointIndex];
    const point = normalized.points[pointIndex];
    if (
      !point ||
      (changedPointIndex !== undefined && sourceIndex !== changedPointIndex)
    ) {
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
    return normalizePelvicPoints(mode, [effective.point, s1First, s1Second])
      .points;
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
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  const existingPelvicPoints =
    resolvedMeasurement?.layout === 'bilateral'
      ? resolvedMeasurement.pelvicPoints.map(point => ({ ...point }))
      : undefined;
  return {
    typeId: getAnnotationTypeId(measurement.type),
    examView: 'lateral',
    requiredKeypointIds:
      mode === 'bilateral' ? BILATERAL_REQUIRED_IDS : SINGLE_REQUIRED_IDS,
    autoDerive: true,
    normalizePoints: points => normalizePelvicPoints(mode, points),
    getKeypointUpdates: (points, changedPointIndex) =>
      getPelvicUpdates(mode, points, changedPointIndex),
    buildMeasurementPoints: byId =>
      buildPelvicPoints(mode, byId, existingPelvicPoints),
    getAvailableMeasurementPointMap: byId => {
      const available = new Map<number, Point>();
      const slots =
        mode === 'bilateral'
          ? ([
              [0, 'FH-1'],
              [2, 'FH-2'],
              [4, 'S1-1'],
              [5, 'S1-2'],
            ] as const)
          : ([
              [0, 'CFH'],
              [1, 'S1-1'],
              [2, 'S1-2'],
            ] as const);
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
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  const isLegacyBilateralLayout =
    resolvedMeasurement?.layout === 'legacy-bilateral-effective-cfh';
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
          ? ([
              [4, 'CFH'],
              [5, 'S1-1'],
              [6, 'S1-2'],
            ] as const)
          : isLegacyBilateralLayout
            ? ([
                [5, 'S1-1'],
                [6, 'S1-2'],
              ] as const)
            : ([
                [4, 'FH-1'],
                [6, 'FH-2'],
                [8, 'S1-1'],
                [9, 'S1-2'],
              ] as const)),
      ] as const;
      return slots.flatMap(([pointIndex, keypointId]) => {
        const sourceIndex = normalized.sourceIndices[pointIndex];
        const point = normalized.points[pointIndex];
        if (
          !point ||
          (changedPointIndex !== undefined && sourceIndex !== changedPointIndex)
        ) {
          return [];
        }
        return [{ keypointId, point: { ...point } }];
      });
    },
    buildMeasurementPoints: byId => {
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
      const existingPelvicPoints =
        resolvedMeasurement?.layout === 'bilateral'
          ? resolvedMeasurement.pelvicPoints.map(point => ({ ...point }))
          : undefined;
      const pelvicPoints = buildPelvicPoints(mode, byId, existingPelvicPoints);
      if (!pelvicPoints) return null;
      return normalizePoints([...(t1Points as Point[]), ...pelvicPoints])
        .points;
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
        if (resolvedMeasurement?.layout === 'bilateral') {
          available.set(5, { ...resolvedMeasurement.pelvicPoints[1] });
          available.set(7, { ...resolvedMeasurement.pelvicPoints[3] });
        }
      }
      return available;
    },
    getDrawingHint: pointIndex => {
      if (isLegacyBilateralLayout) {
        return (
          [
            'T1-1',
            'T1-2',
            'T1-3',
            'T1-4',
            'effectiveCFH（由FH-1/FH-2确定）',
            'S1-1',
            'S1-2',
          ][pointIndex] ?? null
        );
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
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  // 绘制状态机会用空 points 的临时 measurement 探针传递用户选择的 FH 模式；
  // 它尚未进入持久化协议，可以读取 metadata。非空历史记录则必须由 resolver
  // 成功解析，避免损坏布局重新进入关键点同步链路。
  const placementProbeMode =
    measurement.points.length === 0 &&
    isPelvicMeasurementMetadata(measurement.pelvicMetadata)
      ? measurement.pelvicMetadata.femoralHeadMode
      : null;
  const mode = resolvedMeasurement?.mode ?? placementProbeMode;
  if (!mode) return null;
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
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  if (!resolvedMeasurement || resolvedMeasurement.layout !== 'bilateral') {
    return points;
  }
  const toolId = resolvedMeasurement.toolId;
  const pelvicPoints = [...resolvedMeasurement.pelvicPoints];
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
