import { describe, expect, it } from 'vitest';

import {
  isAnteriorExamType,
  isApProjectionExamType,
  isBendingExamType,
  isKeypointSupportedExamType,
  isLateralExamType,
} from '../../src/shared/domain/anatomy';

describe('exam type rules', () => {
  it.each(['左侧曲位', '右侧曲位'])(
    'recognizes %s as an AP bending exam',
    examType => {
      expect(isBendingExamType(examType)).toBe(true);
      expect(isApProjectionExamType(examType)).toBe(true);
      expect(isKeypointSupportedExamType(examType)).toBe(true);
      expect(isAnteriorExamType(examType)).toBe(false);
    }
  );

  it('keeps AP, lateral and unsupported exams distinct', () => {
    expect(isAnteriorExamType('正位X光片')).toBe(true);
    expect(isApProjectionExamType('正位X光片')).toBe(true);
    expect(isLateralExamType('侧位X光片')).toBe(true);
    expect(isKeypointSupportedExamType('CT')).toBe(false);
  });
});
