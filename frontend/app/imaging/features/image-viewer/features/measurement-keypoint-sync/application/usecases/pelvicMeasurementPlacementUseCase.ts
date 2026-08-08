import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  getPelvicToolPointCount,
  resolvePelvicMeasurement,
  type FemoralHeadMode,
  type PelvicToolId,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

/**
 * 手动 PI/PT/TPA 只继承真实关键点。双 FH 的半径控制点属于测量项自身；只有
 * 已有同一组双 FH 骨盆测量时才继承圆半径，避免把默认半径伪装成用户落点。
 */
export function getPelvicPlacementInheritedPointMap({
  toolId,
  mode,
  keypoints,
  measurements,
}: {
  toolId: PelvicToolId;
  mode: FemoralHeadMode;
  keypoints: readonly KeypointAnnotation[];
  measurements: readonly MeasurementData[];
}): Map<number, Point> {
  const byId = new Map(
    keypoints.map(keypoint => [keypoint.id, keypoint.point])
  );
  const inherited = new Map<number, Point>();
  const t1Slots =
    toolId === 'tpa'
      ? ([
          [0, 'T1-1'],
          [1, 'T1-2'],
          [2, 'T1-3'],
          [3, 'T1-4'],
        ] as const)
      : [];
  const pelvicOffset = toolId === 'tpa' ? 4 : 0;
  const pelvicSlots =
    mode === 'bilateral'
      ? ([
          [pelvicOffset, 'FH-1'],
          [pelvicOffset + 2, 'FH-2'],
          [pelvicOffset + 4, 'S1-1'],
          [pelvicOffset + 5, 'S1-2'],
        ] as const)
      : ([
          [pelvicOffset, 'CFH'],
          [pelvicOffset + 1, 'S1-1'],
          [pelvicOffset + 2, 'S1-2'],
        ] as const);
  const slots = [...t1Slots, ...pelvicSlots] as const;

  slots.forEach(([pointIndex, keypointId]) => {
    const point = byId.get(keypointId);
    if (point) inherited.set(pointIndex, { ...point });
  });

  if (mode === 'bilateral') {
    const existing = measurements
      .map(resolvePelvicMeasurement)
      .find(measurement => measurement?.layout === 'bilateral');
    if (existing?.layout === 'bilateral') {
      inherited.set(pelvicOffset + 1, { ...existing.pelvicPoints[1] });
      inherited.set(pelvicOffset + 3, { ...existing.pelvicPoints[3] });
    }
  }

  return inherited;
}

export function getNextPelvicPlacementPointIndex(
  toolId: PelvicToolId,
  mode: FemoralHeadMode,
  inherited: ReadonlyMap<number, Point>,
  clickedPointCount: number
): number | null {
  const missingIndices = Array.from(
    { length: getPelvicToolPointCount(toolId, mode) },
    (_, pointIndex) => (inherited.has(pointIndex) ? null : pointIndex)
  ).filter((pointIndex): pointIndex is number => pointIndex !== null);
  return missingIndices[clickedPointCount] ?? null;
}
