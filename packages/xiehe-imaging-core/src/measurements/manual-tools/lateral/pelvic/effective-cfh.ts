import type { Point } from '../../../../contracts';

import type { FemoralHeadMode } from '../../../../contracts';
import type { EffectiveCfhResolution } from './types';

export const SINGLE_FH_KEYPOINT_IDS = ['CFH'] as const;
export const BILATERAL_FH_KEYPOINT_IDS = ['FH-1', 'FH-2'] as const;

function midpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

/**
 * 解析所有骨盆测量共同使用的有效股骨头中心。
 *
 * effectiveCFH 不是可持久化关键点：单 FH 直接引用 CFH，双 FH 则保存
 * FH-1/FH-2 并在使用时计算中点，从而保留真实依赖和删除语义。
 */
export function resolveEffectiveCfh(
  pointsById: ReadonlyMap<string, Point>,
  preferredMode?: FemoralHeadMode
): EffectiveCfhResolution {
  const cfh = pointsById.get('CFH');
  const fh1 = pointsById.get('FH-1');
  const fh2 = pointsById.get('FH-2');

  if (!preferredMode && cfh && (fh1 || fh2)) {
    return { status: 'conflict' };
  }

  const mode = preferredMode ?? (cfh ? 'single' : 'bilateral');
  if (mode === 'single') {
    return cfh
      ? {
          status: 'ready',
          mode,
          point: { ...cfh },
          dependencyIds: SINGLE_FH_KEYPOINT_IDS,
        }
      : { status: 'missing', mode, missingKeypointIds: ['CFH'] };
  }

  const missingKeypointIds = BILATERAL_FH_KEYPOINT_IDS.filter(
    keypointId => !pointsById.has(keypointId)
  );
  if (!fh1 || !fh2) {
    return { status: 'missing', mode, missingKeypointIds };
  }
  return {
    status: 'ready',
    mode,
    point: midpoint(fh1, fh2),
    dependencyIds: BILATERAL_FH_KEYPOINT_IDS,
  };
}
