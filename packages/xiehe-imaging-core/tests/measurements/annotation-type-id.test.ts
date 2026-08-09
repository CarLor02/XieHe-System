import { describe, expect, it } from 'vitest';

import {
  getAnnotationTypeId,
  normalizeAnnotationLookupKey,
} from '../../src/measurements';

describe('annotation type id', () => {
  it('normalizes fixed measurement names without a catalog dependency', () => {
    expect(normalizeAnnotationLookupKey(' T1 Slope ')).toBe('t1-slope');
  });

  it('preserves AI ids and normalizes numbered Cobb ids', () => {
    expect(getAnnotationTypeId('AI检测-T1')).toBe('AI检测-T1');
    expect(getAnnotationTypeId('Cobb12')).toBe('cobb12');
    expect(getAnnotationTypeId('lateral-Cobb3')).toBe('lateral-cobb3');
  });
});
