import { calculateHorizontalAngleResults } from '../../../shared-rules';
import { isTwoPointLineInRange } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

/** CA 只表达锁骨线与水平线的夹角大小，不保留方向。 */
export const calculateCaResults = (points: Point[]) =>
  calculateHorizontalAngleResults('CA', points, true);

export const isCaInRange = isTwoPointLineInRange;
