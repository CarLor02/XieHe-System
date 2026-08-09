import { calculateHorizontalAngleResults } from '../../../shared-rules';
import { isTwoPointLineInRange } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * CSS 点序为图像左侧点到右侧点；左侧更高时图像坐标 dy 为正，因此结果为正。
 */
export const calculateCssResults = (points: Point[]) =>
  calculateHorizontalAngleResults('CSS', points);

export const isCssInRange = isTwoPointLineInRange;
