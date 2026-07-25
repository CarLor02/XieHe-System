import { calculateHorizontalAngleResults } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/line-angle';
import { isTwoPointLineInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/** 侧位 T1 Slope 保留图像点序产生的有符号水平角。 */
export const calculateT1SlopeResults = (points: Point[]) =>
  calculateHorizontalAngleResults('T1 Slope', points);

export const isT1SlopeInRange = isTwoPointLineInRange;
