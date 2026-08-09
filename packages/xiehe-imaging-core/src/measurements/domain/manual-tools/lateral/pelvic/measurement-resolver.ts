import { getAnnotationTypeId } from '../../../shared-rules';
import {
  invalid,
  resolved,
  type MeasurementResolver,
  type ResolvedVariableMeasurementBase,
} from '../../../shared-rules';
import { isLateralExamType } from '../../../../../shared/domain/anatomy';
import type { Point } from '../../../../../shared/domain/contracts';

import {
  BILATERAL_PELVIC_POINT_COUNT,
  getPelvicMeasurementGeometry,
  isPelvicMeasurementMetadata,
  SINGLE_PELVIC_POINT_COUNT,
} from './point-layout';
import {
  BILATERAL_TPA_POINT_COUNT,
  extractBilateralPelvicPoints,
  SINGLE_TPA_POINT_COUNT,
} from './tool-point-layout';
import { replaceBilateralPelvicPoints } from './tool-point-layout';
import type {
  FemoralHeadMode,
  PelvicToolId,
} from '../../../../../shared/domain/contracts';
import type { PelvicMeasurementGeometry } from './types';

export interface ResolvedPelvicMeasurement extends ResolvedVariableMeasurementBase {
  kind: 'pelvic';
  toolId: PelvicToolId;
  mode: FemoralHeadMode;
  layout: 'single' | 'bilateral' | 'legacy-bilateral-effective-cfh';
  isLegacy: boolean;
  t1Points: readonly [Point, Point, Point, Point] | null;
  pelvicPoints: readonly Point[];
  geometry: PelvicMeasurementGeometry;
  femoralCenterPointIndices: readonly [number, number] | null;
}

function isPelvicToolId(value: string): value is PelvicToolId {
  return value === 'pi' || value === 'pt' || value === 'tpa';
}

function inferMode(
  toolId: PelvicToolId,
  points: readonly Point[]
): FemoralHeadMode | null {
  if (toolId === 'tpa') {
    if (points.length === SINGLE_TPA_POINT_COUNT) return 'single';
    if (points.length === BILATERAL_TPA_POINT_COUNT) return 'bilateral';
    return null;
  }
  if (points.length === SINGLE_PELVIC_POINT_COUNT) return 'single';
  if (points.length === BILATERAL_PELVIC_POINT_COUNT) return 'bilateral';
  return null;
}

export const PELVIC_MEASUREMENT_RESOLVER: MeasurementResolver<ResolvedPelvicMeasurement> =
  {
    id: 'lateral-pelvic',
    supports(measurement, context) {
      return (
        isLateralExamType(context.examType) &&
        isPelvicToolId(getAnnotationTypeId(measurement.type))
      );
    },
    resolve(measurement) {
      const toolId = getAnnotationTypeId(measurement.type);
      if (!isPelvicToolId(toolId)) return invalid('不是骨盆可变布局工具');

      const inferredMode = inferMode(toolId, measurement.points);
      if (!inferredMode)
        return invalid(`${toolId.toUpperCase()} 点位数量不受支持`);

      const metadata = isPelvicMeasurementMetadata(measurement.pelvicMetadata)
        ? measurement.pelvicMetadata
        : null;
      // 历史兼容：旧双 FH TPA 曾保存七点
      // [T1四角,effectiveCFH,S1-1,S1-2] 并标记 bilateral。它没有圆半径点，
      // 只能保留该稳定契约，不能按新十点布局迁移或按单 FH 写回 CFH。
      const isLegacyBilateralTpa =
        toolId === 'tpa' &&
        measurement.points.length === SINGLE_TPA_POINT_COUNT &&
        metadata?.femoralHeadMode === 'bilateral';
      if (
        metadata &&
        metadata.femoralHeadMode !== inferredMode &&
        !isLegacyBilateralTpa
      ) {
        return invalid(`${toolId.toUpperCase()} metadata 与点位数量不一致`);
      }
      const mode = isLegacyBilateralTpa
        ? 'bilateral'
        : (metadata?.femoralHeadMode ?? inferredMode);

      const t1Points =
        toolId === 'tpa'
          ? (measurement.points.slice(0, 4) as [Point, Point, Point, Point])
          : null;
      const pelvicPoints =
        toolId === 'tpa'
          ? inferredMode === 'bilateral'
            ? extractBilateralPelvicPoints('tpa', measurement.points)
            : measurement.points.slice(4, 7)
          : measurement.points;
      if (!pelvicPoints) return invalid('无法提取 TPA 骨盆点位片段');

      const geometry = getPelvicMeasurementGeometry([...pelvicPoints]);
      if (!geometry?.femoralHeadCenter) {
        return invalid(`${toolId.toUpperCase()} 骨盆几何退化`);
      }

      return resolved({
        kind: 'pelvic',
        resolverId: 'lateral-pelvic',
        measurement,
        toolId,
        mode,
        layout: isLegacyBilateralTpa
          ? 'legacy-bilateral-effective-cfh'
          : inferredMode,
        isLegacy: metadata === null || isLegacyBilateralTpa,
        t1Points,
        pelvicPoints,
        geometry,
        femoralCenterPointIndices:
          inferredMode === 'bilateral'
            ? toolId === 'tpa'
              ? [4, 6]
              : [0, 2]
            : null,
        interactivePoints: measurement.points,
      });
    },
  };

export function resolvePelvicMeasurement(
  measurement: Parameters<typeof PELVIC_MEASUREMENT_RESOLVER.resolve>[0]
): ResolvedPelvicMeasurement | null {
  const result = PELVIC_MEASUREMENT_RESOLVER.resolve(measurement, {
    examType: '侧位X光片',
  });
  return result.status === 'resolved' ? result.value : null;
}

export function isBilateralPelvicMeasurement(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0]
): boolean {
  return resolvePelvicMeasurement(measurement)?.layout === 'bilateral';
}

export function getBilateralPelvicGeometryForMeasurement(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0]
): PelvicMeasurementGeometry | null {
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  return resolvedMeasurement?.layout === 'bilateral'
    ? resolvedMeasurement.geometry
    : null;
}

export function getBilateralPelvicPointsForMeasurement(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0]
): Point[] | null {
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  return resolvedMeasurement?.layout === 'bilateral'
    ? resolvedMeasurement.pelvicPoints.map(point => ({ ...point }))
    : null;
}

export function replaceBilateralPelvicPointsForMeasurement(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0],
  pelvicPoints: readonly Point[]
): Point[] {
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  if (!resolvedMeasurement || resolvedMeasurement.layout !== 'bilateral') {
    return measurement.points.map(point => ({ ...point }));
  }
  return replaceBilateralPelvicPoints(
    resolvedMeasurement.toolId,
    measurement.points,
    pelvicPoints
  );
}

export function getPelvicPointDisplayLabel(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0],
  pointIndex: number
): string | number | null {
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  if (
    !resolvedMeasurement ||
    (resolvedMeasurement.toolId !== 'pi' && resolvedMeasurement.toolId !== 'pt')
  ) {
    return null;
  }
  if (resolvedMeasurement.mode === 'bilateral') {
    return (
      ['FH-1', 'R1', 'FH-2', 'R2', 'S1-1', 'S1-2'][pointIndex] ?? pointIndex + 1
    );
  }
  return [3, 1, 2][pointIndex] ?? pointIndex + 1;
}

export function shouldShowPelvicPointDisplayLabel(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0],
  pointIndex: number
): boolean {
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  if (
    !resolvedMeasurement ||
    (resolvedMeasurement.toolId !== 'pi' && resolvedMeasurement.toolId !== 'pt')
  ) {
    return true;
  }

  // 双 FH 圆心和骶骨端点已由检测层标识；测量层仍保留这些点的交互，
  // 但不重复绘制文字。只有不属于关键点层的半径控制点继续显示标签。
  return !(
    resolvedMeasurement.layout === 'bilateral' &&
    (pointIndex === 0 ||
      pointIndex === 2 ||
      pointIndex === 4 ||
      pointIndex === 5)
  );
}

export function getPelvicSharedPointLabelKey(
  measurement: Parameters<typeof resolvePelvicMeasurement>[0],
  pointIndex: number
): string | null {
  const resolvedMeasurement = resolvePelvicMeasurement(measurement);
  if (
    !resolvedMeasurement ||
    (resolvedMeasurement.toolId !== 'pi' && resolvedMeasurement.toolId !== 'pt')
  ) {
    return null;
  }
  if (resolvedMeasurement.mode === 'bilateral') {
    return (
      [
        'pelvic-fh-1',
        'pelvic-fh-radius-1',
        'pelvic-fh-2',
        'pelvic-fh-radius-2',
        'pelvic-s1-1',
        'pelvic-s1-2',
      ][pointIndex] ?? null
    );
  }
  return ['pelvic-cfh', 'pelvic-s1-1', 'pelvic-s1-2'][pointIndex] ?? null;
}
