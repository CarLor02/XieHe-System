import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
import type { Point } from '@xiehe/imaging-core/contracts';
import type { DrawingBounds } from './annotationLayers';
import type { Viewport } from './interaction/canvasGestureModel';
import { SvgLayer } from './SvgLayer';

type MatrixProps = { matrix?: number[]; transform?: string };
type RootProps = {
  style: { left: number; top: number };
  width: number;
  height: number;
  viewBox?: string;
  children?: ReactNode;
};
const native = vi.hoisted(() => ({
  root: null as RootProps | null,
  groups: [] as MatrixProps[],
  applied: {} as MatrixProps,
  pending: null as (() => MatrixProps) | null,
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('react-native-svg', async () => {
  const { createElement, Fragment } = await import('react');
  return {
    default: (props: RootProps) => {
      native.root = props;
      return createElement(Fragment, null, props.children);
    },
    G: (props: MatrixProps & { children?: ReactNode }) => {
      native.groups.push(props);
      return createElement(Fragment, null, props.children);
    },
  };
});
vi.mock('react-native-reanimated', async () => {
  const { createElement } = await import('react');
  return {
    default: {
      createAnimatedComponent:
        (Component: ComponentType<Record<string, unknown>>) =>
        ({ animatedProps, ...props }: { animatedProps: MatrixProps }) =>
          createElement(Component, { ...props, ...animatedProps }),
    },
    // 模拟原生视图已挂载/换位，但 UI 线程仍未应用本次动画属性的那一帧。
    useAnimatedProps: (factory: () => MatrixProps) => {
      native.pending = factory;
      return native.applied;
    },
  };
});

const context = {
  imageNaturalSize: { width: 1000, height: 2000 },
  containerSize: { width: 400, height: 800 },
  imageScale: 1,
  imagePosition: { x: 0, y: 0 },
};
const originalBounds = { x: 64, y: 128, width: 192, height: 192 };
const point = { x: 300, y: 400 };

function renderLayer(
  bounds?: DrawingBounds,
  current: Viewport = context,
  rendered: Viewport = context
) {
  const viewport = { get: () => current } as SharedValue<Viewport>;
  native.groups = [];
  const props = {
    context: { ...context, ...rendered },
    viewport,
    bounds,
    children: null,
  };
  renderToStaticMarkup(createElement(SvgLayer, props));
}

// 按 SVG 的坐标契约组合原生布局、viewBox 和组矩阵，核对最终屏幕位置。
function screenPoint(projected: Point) {
  const root = native.root!;
  let transformed = projected;
  for (const group of [...native.groups].reverse()) {
    const [a, b, c, d, tx, ty] =
      group.matrix ??
      (group.transform
        ? group.transform
            .slice(7, -1)
            .split(/[\s,]+/)
            .map(Number)
        : [1, 0, 0, 1, 0, 0]);
    transformed = {
      x: a * transformed.x + c * transformed.y + tx,
      y: b * transformed.x + d * transformed.y + ty,
    };
  }
  const [x, y, width, height] = root.viewBox
    ? root.viewBox.split(/\s+/).map(Number)
    : [0, 0, root.width, root.height];
  return {
    x: root.style.left + ((transformed.x - x) * root.width) / width,
    y: root.style.top + ((transformed.y - y) * root.height) / height,
  };
}

describe('SVG layer coordinate handoff', () => {
  beforeEach(() => {
    native.root = null;
    native.groups = [];
    native.applied = {};
    native.pending = null;
  });

  it('places a newly mounted drag layer correctly before its first animation update', () => {
    const expected = imageToScreen(point, context);
    renderLayer(originalBounds);
    expect(screenPoint(expected)).toEqual(expected);
    native.applied = native.pending!();
    renderLayer(originalBounds);
    expect(screenPoint(expected)).toEqual(expected);
  });

  it('keeps an existing endpoint in place when crop bounds cross a tile before the animation update', () => {
    renderLayer(originalBounds);
    native.applied = native.pending!();
    const nextBounds = { x: 0, y: 64, width: 256, height: 320 };
    renderLayer(nextBounds);
    const expected = imageToScreen(point, context);
    expect(screenPoint(expected)).toEqual(expected);
    native.applied = native.pending!();
    renderLayer(nextBounds);
    expect(screenPoint(expected)).toEqual(expected);
  });

  it('applies the same pan and zoom to cropped and full canvas geometry', () => {
    const current = { imageScale: 1.25, imagePosition: { x: 20, y: 35 } };
    const expected = imageToScreen(point, { ...context, ...current });
    for (const bounds of [undefined, originalBounds]) {
      renderLayer(bounds, current);
      native.applied = native.pending!();
      renderLayer(bounds, current);
      const actual = screenPoint(imageToScreen(point, context));
      expect(actual.x).toBeCloseTo(expected.x, 8);
      expect(actual.y).toBeCloseTo(expected.y, 8);
    }
  });

  it.each([
    { imageScale: 1, imagePosition: { x: 95, y: -60 } },
    { imageScale: 2.3, imagePosition: { x: -30, y: 140 } },
  ])(
    'does not reapply the viewport when React commits a completed gesture: %j',
    current => {
      renderLayer(undefined, current);
      native.applied = native.pending!();
      const expected = imageToScreen(point, { ...context, ...current });
      // UI 已到终点；React 更新投影坐标时，故意保留上一帧的动画属性。
      renderLayer(undefined, current, current);
      const actual = screenPoint(expected);
      expect(actual.x).toBeCloseTo(expected.x, 8);
      expect(actual.y).toBeCloseTo(expected.y, 8);
      native.applied = native.pending!();
      renderLayer(undefined, current, current);
      expect(screenPoint(expected).x).toBeCloseTo(expected.x, 8);
      expect(screenPoint(expected).y).toBeCloseTo(expected.y, 8);
    }
  );

  it('mounts a new cropped drag layer at the current viewport after panning and zooming', () => {
    const current = { imageScale: 1.5, imagePosition: { x: 35, y: 75 } };
    const expected = imageToScreen(point, { ...context, ...current });
    renderLayer(originalBounds, current, current);
    expect(screenPoint(expected).x).toBeCloseTo(expected.x, 8);
    expect(screenPoint(expected).y).toBeCloseTo(expected.y, 8);
  });
});
