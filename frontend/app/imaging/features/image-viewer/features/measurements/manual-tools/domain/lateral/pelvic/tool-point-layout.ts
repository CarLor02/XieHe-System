import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

import {
  BILATERAL_PELVIC_POINT_COUNT,
  BILATERAL_PELVIC_POINT_LABELS,
  SINGLE_PELVIC_POINT_COUNT,
} from './point-layout';
import type { FemoralHeadMode, PelvicToolId } from './types';

export const SINGLE_TPA_POINT_COUNT = 7;
export const BILATERAL_TPA_POINT_COUNT = 10;

const T1_POINT_LABELS = ['T1-1', 'T1-2', 'T1-3', 'T1-4'] as const;
const SINGLE_TPA_POINT_LABELS = [
  ...T1_POINT_LABELS,
  'CFH',
  'S1-1',
  'S1-2',
] as const;
const BILATERAL_TPA_POINT_LABELS = [
  ...T1_POINT_LABELS,
  ...BILATERAL_PELVIC_POINT_LABELS,
] as const;

export function getPelvicToolPointCount(
  toolId: PelvicToolId,
  mode: FemoralHeadMode
): number {
  if (toolId === 'tpa') {
    return mode === 'bilateral'
      ? BILATERAL_TPA_POINT_COUNT
      : SINGLE_TPA_POINT_COUNT;
  }
  return mode === 'bilateral'
    ? BILATERAL_PELVIC_POINT_COUNT
    : SINGLE_PELVIC_POINT_COUNT;
}

export function getPelvicToolPointLabels(
  toolId: PelvicToolId,
  mode: FemoralHeadMode
): readonly string[] {
  if (toolId === 'tpa') {
    return mode === 'bilateral'
      ? BILATERAL_TPA_POINT_LABELS
      : SINGLE_TPA_POINT_LABELS;
  }
  return mode === 'bilateral'
    ? BILATERAL_PELVIC_POINT_LABELS
    : ['CFH', 'S1-1', 'S1-2'];
}

/**
 * 双 FH TPA 的稳定点序是 T1 四点加 PI/PT 的六点骨盆片段。
 * 将共享片段集中提取，避免计算、拖拽和派生各自维护不同下标。
 */
export function extractBilateralPelvicPoints(
  toolId: PelvicToolId,
  points: readonly Point[]
): Point[] | null {
  if (toolId === 'tpa') {
    return points.length === BILATERAL_TPA_POINT_COUNT
      ? points.slice(4, 10).map(point => ({ ...point }))
      : null;
  }
  return points.length === BILATERAL_PELVIC_POINT_COUNT
    ? points.map(point => ({ ...point }))
    : null;
}

export function replaceBilateralPelvicPoints(
  toolId: PelvicToolId,
  points: readonly Point[],
  pelvicPoints: readonly Point[]
): Point[] {
  if (pelvicPoints.length !== BILATERAL_PELVIC_POINT_COUNT) {
    return points.map(point => ({ ...point }));
  }
  if (toolId === 'tpa') {
    if (points.length !== BILATERAL_TPA_POINT_COUNT) {
      return points.map(point => ({ ...point }));
    }
    return [
      ...points.slice(0, 4).map(point => ({ ...point })),
      ...pelvicPoints.map(point => ({ ...point })),
    ];
  }
  return pelvicPoints.map(point => ({ ...point }));
}

export function getBilateralFemoralCenterPointIndices(
  toolId: PelvicToolId
): readonly [number, number] {
  return toolId === 'tpa' ? [4, 6] : [0, 2];
}

export function getBilateralPelvicPointIndex(
  toolId: PelvicToolId,
  measurementPointIndex: number
): number | null {
  const pelvicPointIndex =
    toolId === 'tpa' ? measurementPointIndex - 4 : measurementPointIndex;
  return pelvicPointIndex >= 0 &&
    pelvicPointIndex < BILATERAL_PELVIC_POINT_COUNT
    ? pelvicPointIndex
    : null;
}
