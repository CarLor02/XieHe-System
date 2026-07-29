import { describe, expect, it } from '@jest/globals';

import {
  getCanvasPointerPolicy,
  normalizeCanvasPointerType,
} from './pointer-input';

describe('pointer input policy', () => {
  it('keeps mouse hit targets and hover behavior unchanged', () => {
    expect(getCanvasPointerPolicy('mouse')).toEqual({
      supportsHover: true,
      pointHitRadius: 10,
      lineHitRadius: 8,
      selectionPadding: 15,
      dragStartThreshold: 3,
    });
  });

  it('uses larger hit targets and no hover for touch', () => {
    const touch = getCanvasPointerPolicy('touch');
    expect(touch.supportsHover).toBe(false);
    expect(touch.pointHitRadius).toBe(22);
    expect(touch.lineHitRadius).toBe(14);
  });

  it('normalizes unknown pointer types to mouse', () => {
    expect(normalizeCanvasPointerType('touch')).toBe('touch');
    expect(normalizeCanvasPointerType('pen')).toBe('pen');
    expect(normalizeCanvasPointerType('')).toBe('mouse');
  });
});
