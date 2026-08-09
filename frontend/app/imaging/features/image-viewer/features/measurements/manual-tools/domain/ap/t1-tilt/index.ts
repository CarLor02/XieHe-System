import { calculateHorizontalAngleResults } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/line-angle';
import { isTwoPointLineInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@xiehe/imaging-core/contracts';

/** T1 Tilt 保留点1到点2的有符号水平角。 */
export const calculateT1TiltResults = (points: Point[]) =>
  calculateHorizontalAngleResults('T1 Tilt', points);

export const isT1TiltInRange = isTwoPointLineInRange;
