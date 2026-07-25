import { calculateHorizontalAngleResults } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/line-angle';
import { isTwoPointLineInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/** PO 与 CSS 使用相同的图像左到右有符号水平角约定。 */
export const calculatePoResults = (points: Point[]) =>
  calculateHorizontalAngleResults('PO', points);

export const isPoInRange = isTwoPointLineInRange;
