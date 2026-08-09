import { calculateHorizontalAngleResults } from '@xiehe/imaging-core/measurements';
import { isTwoPointLineInRange } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * SS 使用 S1 上终板两端点，只输出与水平线的夹角大小。
 * 点位顺序仍由侧位关键点链路保证为图像从左到右。
 */
export const calculateSsResults = (points: Point[]) =>
  calculateHorizontalAngleResults('SS', points, true);

export const isSsInRange = isTwoPointLineInRange;
