import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
import type { EditorState } from '@/features/image-editor/application/ImageEditorSession';
import { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import { AnnotationLabels } from './AnnotationLabels';
import type { Viewport } from './interaction/canvasGestureModel';

const labels = vi.hoisted(() => [] as { x: number; y: number }[]);
vi.mock('react-native-svg', () => ({
  Text: (props: { x: number; y: number }) => {
    labels.push(props);
    return null;
  },
}));
vi.mock('./SvgLayer', async () => {
  const { createElement, Fragment } = await import('react');
  return {
    SvgLayer: ({ children }: { children: ReactNode }) =>
      createElement(Fragment, null, children),
  };
});

function renderLabel(imagePosition = { x: 0, y: 0 }, value = '100mm') {
  const state = {
    history: {
      present: {
        measurements: [
          {
            id: 'line',
            type: 'aux-length',
            value,
            points: [
              { x: 100, y: 100 },
              { x: 900, y: 100 },
            ],
          },
        ],
        keypoints: [],
        standardDistancePoints: [],
      },
    },
  } as unknown as EditorState;
  const readouts = new EditorReadoutStore({
    getState: () => state,
    subscribe: () => () => {},
  });
  const context = {
    imageNaturalSize: { width: 1000, height: 2000 },
    containerSize: { width: 400, height: 800 },
    imageScale: 1,
    imagePosition,
  };
  const viewportValue: Viewport = context;
  labels.length = 0;
  renderToStaticMarkup(
    createElement(AnnotationLabels, {
      readouts,
      context,
      viewport: { get: () => viewportValue } as SharedValue<Viewport>,
      selection: null,
      showKeypoints: false,
    })
  );
  return { x: labels[0].x, y: labels[0].y };
}

describe('measurement label anchoring', () => {
  beforeEach(() => {
    labels.length = 0;
  });

  it.each([
    { x: -500, y: 900 },
    { x: 500, y: -900 },
    { x: 120, y: 50 },
  ])('moves with the image without snapping to canvas edges at %j', offset => {
    const before = renderLabel();
    const after = renderLabel(offset);
    expect(after.x - before.x).toBeCloseTo(offset.x, 8);
    expect(after.y - before.y).toBeCloseTo(offset.y, 8);
  });

  it('keeps its anchor when the displayed value becomes wider near an edge', () => {
    expect(renderLabel({ x: 0, y: 0 }, '1000.00mm')).toEqual(renderLabel());
  });
});
