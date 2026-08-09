import { calculateHorizontalAngleResults } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/line-angle';
import { isTwoPointLineInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@xiehe/imaging-core/contracts';

/** CA 只表达锁骨线与水平线的夹角大小，不保留方向。 */
export const calculateCaResults = (points: Point[]) =>
  calculateHorizontalAngleResults('CA', points, true);

export const isCaInRange = isTwoPointLineInRange;
