import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
import type { Viewport } from './interaction/canvasGestureModel';
import { needsViewportRedraw } from './interaction/viewportCache';
import { SvgLayer } from './SvgLayer';

type Transform = {
  transform: [
    { translateX: number },
    { translateY: number },
    { scale: number },
  ];
};
type Svg = {
  style: { left: number; top: number };
  width: number;
  height: number;
  viewBox: string;
};
const capture = vi.hoisted(() => ({
  svg: null as Svg | null,
  inverse: null as Transform | null,
  live: null as (() => Transform) | null,
  renders: 0,
}));
vi.mock('react-native', () => ({
  StyleSheet: { absoluteFill: {} },
  View: ({
    style,
    children,
  }: {
    style: [object, Transform];
    children: ReactNode;
  }) => {
    capture.inverse = style[1];
    return children;
  },
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: ({ children }: { children: ReactNode }) => children },
  useAnimatedStyle: (get: () => Transform) => {
    capture.live = get;
    return get();
  },
}));
vi.mock('react-native-svg', () => ({
  default: (props: Svg) => {
    capture.svg = props;
    capture.renders++;
    return null;
  },
}));
const size = { width: 400, height: 800 };
const base = { imageScale: 1, imagePosition: { x: 0, y: 0 } };
const dimensions = {
  containerSize: size,
  imageNaturalSize: { width: 1000, height: 2000 },
};
describe('composited annotation viewport', () => {
  it.each([undefined, { x: 64, y: 128, width: 192, height: 192 }])(
    'keeps cropped and full layers aligned across a cache handoff (%j)',
    bounds => {
      let current: Viewport = base;
      const viewport = { get: () => current } as SharedValue<Viewport>;
      const point = { x: 350, y: 420 };
      const render = (rendered: Viewport) =>
        renderToStaticMarkup(
          createElement(
            SvgLayer,
            {
              context: { ...dimensions, ...rendered },
              viewport,
              bounds,
            },
            null
          )
        );
      const check = (rendered: Viewport) => {
        const root = capture.svg!;
        const [x, y, w, h] = root.viewBox.split(' ').map(Number);
        let p = imageToScreen(point, { ...dimensions, ...rendered });
        p = {
          x: root.style.left + ((p.x - x) * root.width) / w,
          y: root.style.top + ((p.y - y) * root.height) / h,
        };
        for (const style of [capture.inverse!, capture.live!()]) {
          const [tx, ty, s] = style.transform;
          p = {
            x: (p.x - 200) * s.scale + 200 + tx.translateX,
            y: (p.y - 400) * s.scale + 400 + ty.translateY,
          };
        }
        const expected = imageToScreen(point, { ...dimensions, ...current });
        expect(p.x).toBeCloseTo(expected.x, 8);
        expect(p.y).toBeCloseTo(expected.y, 8);
      };
      render(base);
      const initial = capture.renders;
      for (let i = 0; i < 60; i++) {
        current = {
          imageScale: 1 + i / 600,
          imagePosition: { x: i / 4, y: -i / 2 },
        };
        check(base);
      }
      expect(capture.renders).toBe(initial);
      render(current);
      check(current);
      current = { imageScale: 3, imagePosition: { x: 120, y: -180 } };
      render(current);
      check(current);
    }
  );
  it('includes off-screen points and starts replenishing the cache before they reach its edge', () => {
    renderToStaticMarkup(
      createElement(
        SvgLayer,
        {
          context: { ...dimensions, ...base },
          viewport: { get: () => base } as SharedValue<Viewport>,
        },
        null
      )
    );
    const { style, width, height } = capture.svg!;
    expect(style.left).toBeLessThan(0);
    expect(style.top).toBeLessThan(0);
    expect(style.left + width).toBeGreaterThan(size.width);
    expect(style.top + height).toBeGreaterThan(size.height);
    const pan = (x: number) => ({ ...base, imagePosition: { x, y: 0 } });
    expect(needsViewportRedraw(base, pan(4), size)).toBe(false);
    expect(needsViewportRedraw(base, pan(-style.left * 0.8), size)).toBe(true);
    expect(needsViewportRedraw(base, { ...base, imageScale: 0.5 }, size)).toBe(
      true
    );
  });
});
