import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import {
  createDefaultBilateralPelvicPoints,
  createPelvicMeasurementMetadata,
  extractBilateralPelvicPoints,
  resolveEffectiveCfh,
  type PelvicToolId,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

function findExistingBilateralPelvicPoints(
  measurements: readonly MeasurementData[]
): Point[] | null {
  const measurement = measurements.find(item => {
    const typeId = getAnnotationTypeId(item.type);
    return (
      (typeId === 'pi' || typeId === 'pt' || typeId === 'tpa') &&
      item.pelvicMetadata?.schemaVersion === 2 &&
      item.pelvicMetadata.femoralHeadMode === 'bilateral' &&
      extractBilateralPelvicPoints(typeId, item.points) !== null
    );
  });
  if (!measurement) return null;
  return extractBilateralPelvicPoints(
    getAnnotationTypeId(measurement.type) as PelvicToolId,
    measurement.points
  );
}

/**
 * 从全局关键点派生骨盆测量。effectiveCFH 的模式由关键点集合唯一决定；
 * CFH 与任意 FH-* 同时存在时视为导入冲突，不静默删除任何一侧，也不创建新测量。
 */
export function derivePelvicMeasurements({
  keypoints,
  previousMeasurements = [],
  calculationContext,
}: {
  keypoints: KeypointAnnotation[];
  previousMeasurements?: readonly MeasurementData[];
  calculationContext: CalculationContext;
}): MeasurementData[] {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint.point]));
  const effective = resolveEffectiveCfh(byId);
  const s1First = byId.get('S1-1');
  const s1Second = byId.get('S1-2');
  if (effective.status !== 'ready' || !s1First || !s1Second) return [];

  const pelvicPoints =
    effective.mode === 'single'
      ? [effective.point, { ...s1First }, { ...s1Second }]
      : (findExistingBilateralPelvicPoints(previousMeasurements) ??
        createDefaultBilateralPelvicPoints({
          fh1: byId.get('FH-1')!,
          fh2: byId.get('FH-2')!,
          s1First,
          s1Second,
          imageSize: calculationContext.imageNaturalSize,
        }));
  const metadata = createPelvicMeasurementMetadata(effective.mode);
  const candidates: MeasurementData[] = (['pi', 'pt'] as const).map(typeId => ({
    id: `vertebrae-derived-${typeId}`,
    type: typeId.toUpperCase(),
    value: calculateMeasurementValue(typeId, pelvicPoints, calculationContext),
    points: pelvicPoints.map(point => ({ ...point })),
    description: `[推导] ${typeId}`,
    keypointSynced: true,
    pelvicMetadata: metadata,
  }));

  const t1Points = ['T1-1', 'T1-2', 'T1-3', 'T1-4'].map(id => byId.get(id));
  if (t1Points.every((point): point is Point => Boolean(point))) {
    // 创建双 FH TPA 时保留完整六点骨盆片段，使其与 PI/PT 共享圆心、半径和
    // S1 点；单 FH 及历史 TPA 继续使用原七点结构。
    const tpaPoints =
      effective.mode === 'bilateral'
        ? [...t1Points, ...pelvicPoints.map(point => ({ ...point }))]
        : [
            ...t1Points,
            effective.point,
            { ...s1First },
            { ...s1Second },
          ];
    candidates.push({
      id: 'vertebrae-derived-tpa',
      type: 'TPA',
      value: calculateMeasurementValue('tpa', tpaPoints, calculationContext),
      points: tpaPoints,
      description: '[推导] tpa',
      keypointSynced: true,
      pelvicMetadata: metadata,
    });
  }

  return candidates;
}
