import { calculateHorizontalAngleResults } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/line-angle';
import { isTwoPointLineInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * CSS 点序为图像左侧点到右侧点；左侧更高时图像坐标 dy 为正，因此结果为正。
 */
export const calculateCssResults = (points: Point[]) =>
  calculateHorizontalAngleResults('CSS', points);

export const isCssInRange = isTwoPointLineInRange;
