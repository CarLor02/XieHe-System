import { calculateHorizontalAngleResults } from '../../../shared-rules';
import { isTwoPointLineInRange } from '../../../../../shared/domain/geometry';
import type { Point } from '../../../../../shared/domain/contracts';

/** PO 与 CSS 使用相同的图像左到右有符号水平角约定。 */
export const calculatePoResults = (points: Point[]) =>
  calculateHorizontalAngleResults('PO', points);

export const isPoInRange = isTwoPointLineInRange;
