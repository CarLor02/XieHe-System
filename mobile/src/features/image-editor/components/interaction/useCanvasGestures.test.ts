// @vitest-environment jsdom
import { createElement, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import type { ImageEditorGateway } from '@/features/image-editor/application/ports';
import { useCanvasGestures } from './useCanvasGestures';

type Callback = (...args: unknown[]) => void;
const runtime = vi.hoisted(() => ({
  handlers: {} as Record<string, Record<string, Callback>>,
  rnQueue: [] as (() => void)[],
}));

vi.mock('react-native-gesture-handler', () => {
  function gesture(kind: string) {
    const handlers: Record<string, Callback> = {};
    runtime.handlers[kind] = handlers;
    const result: Record<string, unknown> = {};
    for (const name of [
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
      'onBegin',
      'onTouchesDown',
    ]) {
      result[name] = (callback: Callback) => {
        handlers[name] = callback;
        return result;
      };
    }
    for (const name of [
      'maxPointers',
      'minDistance',
      'maxDistance',
      'maxDuration',
    ]) {
      result[name] = () => result;
    }
    return result;
  }
  return {
    Gesture: {
      Pan: () => gesture('pan'),
      Pinch: () => gesture('pinch'),
      Tap: () => gesture('tap'),
      Simultaneous: (...gestures: unknown[]) => gestures,
      Exclusive: (...gestures: unknown[]) => gestures,
    },
  };
});
vi.mock('react-native-worklets', () => ({
  scheduleOnUI: (callback: Callback, ...args: unknown[]) => callback(...args),
  scheduleOnRN: (callback: Callback, ...args: unknown[]) =>
    runtime.rnQueue.push(() => callback(...args)),
}));
vi.mock('react-native-reanimated', async () => {
  const { useState } = await import('react');
  return {
    useFrameCallback: () => {},
    useSharedValue: <T>(initial: T) => {
      const [shared] = useState(() => {
        let value = initial;
        return {
          get: () => value,
          set: (next: T) => {
            value = next;
          },
        };
      });
      return shared;
    },
  };
});

const imageSize = { width: 1000, height: 2000 };
const containerSize = { width: 400, height: 800 };
let root: Root;
let container: HTMLDivElement;
let canvas: ReturnType<typeof useCanvasGestures>;
let session: ImageEditorSession;

function Harness() {
  const result = useCanvasGestures(session, imageSize, containerSize, {
    dragging: false,
    drawing: false,
  });
  useLayoutEffect(() => {
    canvas = result;
  }, [result]);
  return null;
}

function pinch(
  callback: string,
  event?: {
    focalX: number;
    focalY: number;
    scale: number;
    numberOfPointers: number;
  }
) {
  flushSync(() => runtime.handlers.pinch[callback](event));
}

function flushRN() {
  flushSync(() => {
    while (runtime.rnQueue.length) runtime.rnQueue.shift()!();
  });
}

describe('pinch viewport lifecycle', () => {
  beforeEach(() => {
    runtime.handlers = {};
    runtime.rnQueue = [];
    const gateway: ImageEditorGateway = {
      getImage: vi.fn(),
      getPreview: vi.fn(),
      save: vi.fn(),
      measure: vi.fn(),
      generate: vi.fn(),
    };
    session = new ImageEditorSession(1, gateway);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    flushSync(() => root.render(createElement(Harness)));
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
  });

  it.each([1, 0])(
    'keeps the last two-finger viewport when the trailing update has %s fingers',
    numberOfPointers => {
      pinch('onStart', {
        focalX: 200,
        focalY: 300,
        scale: 1,
        numberOfPointers: 2,
      });
      pinch('onUpdate', {
        focalX: 210,
        focalY: 310,
        scale: 1.4,
        numberOfPointers: 2,
      });
      const lastValid = canvas.viewport.get();
      expect(lastValid.imageScale).toBe(1.4);
      // Android 抬起一指后焦点移到剩余手指，缩放比例却保持不变。
      pinch('onUpdate', {
        focalX: 330,
        focalY: 440,
        scale: 1.4,
        numberOfPointers,
      });
      expect(canvas.viewport.get()).toEqual(lastValid);
      pinch('onFinalize');
      flushRN();
      expect(canvas.renderedViewport).toEqual(lastValid);
      expect(canvas.viewport.get()).toEqual(lastValid);
    }
  );

  it('keeps two-finger translation and starts the next pinch from the committed view', () => {
    pinch('onStart', {
      focalX: 200,
      focalY: 300,
      scale: 1,
      numberOfPointers: 2,
    });
    pinch('onUpdate', {
      focalX: 230,
      focalY: 320,
      scale: 1,
      numberOfPointers: 2,
    });
    expect(canvas.viewport.get().imagePosition).toEqual({ x: 30, y: 20 });
    pinch('onFinalize');
    flushRN();
    pinch('onStart', {
      focalX: 200,
      focalY: 400,
      scale: 1,
      numberOfPointers: 2,
    });
    pinch('onUpdate', {
      focalX: 200,
      focalY: 400,
      scale: 2,
      numberOfPointers: 2,
    });
    expect(canvas.viewport.get()).toEqual({
      imageScale: 2,
      imagePosition: { x: 60, y: 40 },
    });
    pinch('onFinalize');
    flushRN();
    expect(canvas.renderedViewport).toEqual(canvas.viewport.get());
    const final = canvas.viewport.get();
    pinch('onUpdate', { focalX: 0, focalY: 0, scale: 1, numberOfPointers: 2 });
    expect(canvas.viewport.get()).toEqual(final);
  });
});
