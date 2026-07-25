import { calculateHorizontalAngleResults } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/line-angle';
import { isTwoPointLineInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * SS 使用 S1 上终板两端点，只输出与水平线的夹角大小。
 * 点位顺序仍由侧位关键点链路保证为图像从左到右。
 */
export const calculateSsResults = (points: Point[]) =>
  calculateHorizontalAngleResults('SS', points, true);

export const isSsInRange = isTwoPointLineInRange;
