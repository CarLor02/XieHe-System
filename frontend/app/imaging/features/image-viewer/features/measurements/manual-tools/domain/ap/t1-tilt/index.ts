import { calculateHorizontalAngleResults } from '@xiehe/imaging-core/measurements';
import { isTwoPointLineInRange } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

/** T1 Tilt 保留点1到点2的有符号水平角。 */
export const calculateT1TiltResults = (points: Point[]) =>
  calculateHorizontalAngleResults('T1 Tilt', points);

export const isT1TiltInRange = isTwoPointLineInRange;
