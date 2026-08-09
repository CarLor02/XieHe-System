import { calculateHorizontalAngleResults } from '../../../shared-rules';
import { isTwoPointLineInRange } from '../../../../../shared/domain/geometry';
import type { Point } from '../../../../../shared/domain/contracts';

/** T1 Tilt 保留点1到点2的有符号水平角。 */
export const calculateT1TiltResults = (points: Point[]) =>
  calculateHorizontalAngleResults('T1 Tilt', points);

export const isT1TiltInRange = isTwoPointLineInRange;
