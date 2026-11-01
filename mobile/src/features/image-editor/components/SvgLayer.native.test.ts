// @vitest-environment jsdom
import { createElement, type ComponentType, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
import type { Point } from '@xiehe/imaging-core/contracts';
import type { Viewport } from './interaction/canvasGestureModel';
import { SvgLayer } from './SvgLayer';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('react-native-svg', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ children }: { children: ReactNode }) =>
      createElement('svg', null, children),
    // 原生 G 的 React 渲染只读取 transform；matrix 是原生更新入口，不能当作声明式属性。
    G: ({ transform, children }: { transform?: string; children: ReactNode }) =>
      createElement('g', { transform }, children),
  };
});
vi.mock('react-native-reanimated', async () => {
  const { createElement } = await import('react');
  return {
    default: {
      createAnimatedComponent:
        (Component: ComponentType<Record<string, unknown>>) =>
        ({ animatedProps, ...props }: { animatedProps: object }) =>
          createElement(Component, { ...props, ...animatedProps }),
    },
    // 单独检查 React 提交后的原生绘制，不依赖后续动画帧把错误位置补回来。
    useAnimatedProps: (updater: () => object) => updater(),
  };
});

const size = {
  imageNaturalSize: { width: 1000, height: 2000 },
  containerSize: { width: 400, height: 800 },
};
let container: HTMLDivElement;
let root: Root;

function render(current: Viewport, point: Point) {
  const context = { ...size, ...current };
  const projected = imageToScreen(point, context);
  const props = {
    context,
    viewport: { get: () => current } as SharedValue<Viewport>,
    children: [
      createElement('line', { key: 'line', x1: projected.x, y1: projected.y }),
      createElement(
        'text',
        { key: 'label', x: projected.x + 19, y: projected.y - 10 },
        '测量值'
      ),
    ],
  };
  // 始终复用同一棵 React 树，覆盖 useState 初值在缩放和拖动重绘之间被保留的情况。
  flushSync(() => root.render(createElement(SvgLayer, props)));
  return projected;
}

function screenPosition(selector: 'line' | 'text') {
  const node = container.querySelector(selector)!;
  let point = {
    x: Number(node.getAttribute(selector === 'line' ? 'x1' : 'x')),
    y: Number(node.getAttribute(selector === 'line' ? 'y1' : 'y')),
  };
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const transform = parent.getAttribute('transform');
    if (!transform) continue;
    const [a, b, c, d, x, y] = transform
      .slice(7, -1)
      .split(/[\s,]+/)
      .map(Number);
    point = {
      x: a * point.x + c * point.y + x,
      y: b * point.x + d * point.y + y,
    };
  }
  return point;
}

describe('native SVG declarative redraw', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
  });

  it.each([1, 2.44])(
    'keeps geometry and labels aligned during drag redraws after mounting at zoom %s',
    initialScale => {
      render(
        { imageScale: initialScale, imagePosition: { x: 0, y: 0 } },
        { x: 350, y: 700 }
      );
      for (const current of [
        { imageScale: 2.44, imagePosition: { x: 40, y: 80 } },
        { imageScale: 3.2, imagePosition: { x: -70, y: 120 } },
      ]) {
        for (const x of [350, 365, 320, 390]) {
          const expected = render(current, { x, y: 700 });
          const line = screenPosition('line');
          const label = screenPosition('text');
          expect(line.x).toBeCloseTo(expected.x, 8);
          expect(line.y).toBeCloseTo(expected.y, 8);
          expect(label.x).toBeCloseTo(expected.x + 19, 8);
          expect(label.y).toBeCloseTo(expected.y - 10, 8);
        }
      }
    }
  );
});
