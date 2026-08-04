import { expect, it } from '@jest/globals';

import {
  isAnteriorExamType,
  isApProjectionExamType,
  isBendingExamType,
  isKeypointSupportedExamType,
} from './exam-type';

it.each(['左侧曲位', '右侧曲位'])(
  'recognizes %s as an AP bending exam',
  examType => {
    expect(isBendingExamType(examType)).toBe(true);
    expect(isApProjectionExamType(examType)).toBe(true);
    expect(isKeypointSupportedExamType(examType)).toBe(true);
    expect(isAnteriorExamType(examType)).toBe(false);
  }
);

it('keeps the standard AP exam distinct from bending exams', () => {
  expect(isAnteriorExamType('正位X光片')).toBe(true);
  expect(isBendingExamType('正位X光片')).toBe(false);
  expect(isApProjectionExamType('正位X光片')).toBe(true);
});
