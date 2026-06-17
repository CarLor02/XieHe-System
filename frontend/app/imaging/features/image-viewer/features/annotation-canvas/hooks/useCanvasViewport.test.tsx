import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiClient } from '@/lib/api';
import { useCanvasViewport } from './useCanvasViewport';

let resizeObserverCallback: ResizeObserverCallback | null = null;
const mockedApiGet = jest.spyOn(apiClient, 'get');

class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }
}

function emitResize(width: number, height: number) {
  if (!resizeObserverCallback) {
    throw new Error('ResizeObserver was not created');
  }

  act(() => {
    resizeObserverCallback!(
      [
        {
          contentRect: { width, height },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver
    );
  });
}

function ViewportHarness({
  onValue,
  includeWheelBlocker = false,
}: {
  onValue: (value: ReturnType<typeof useCanvasViewport>) => void;
  includeWheelBlocker?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const value = useCanvasViewport({
    imageId: 'IMG0001',
    centerOnPoint: null,
    containerRef,
    selectedTool: 'hand',
    isSettingStandardDistance: false,
    onCenterConsumed: jest.fn(),
    onImageSizeChange: jest.fn(),
    onResetView: jest.fn(),
  });

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return (
    <div ref={containerRef} data-testid="viewport">
      {includeWheelBlocker && (
        <div data-canvas-wheel-blocker data-testid="wheel-blocker" />
      )}
    </div>
  );
}

describe('useCanvasViewport', () => {
  beforeEach(() => {
    resizeObserverCallback = null;
    mockedApiGet.mockReset();
    mockedApiGet.mockImplementation(async (url: string) => {
      if (url.endsWith('/download-url')) {
        return {
          data: {
            code: 200,
            data: {
              url: '/image.png',
              expires_in: 900,
              expires_at: '2026-05-11T01:00:00Z',
            },
          },
        };
      }

      return {
        data: {
          code: 200,
          data: {
            id: 1,
            file_uuid: 'file-1',
            original_filename: 'image.png',
          },
        },
      };
    });
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: ResizeObserverMock,
    });
  });

  it('updates container size when the annotation viewport is resized', async () => {
    const observedValues: ReturnType<typeof useCanvasViewport>[] = [];

    render(
      <ViewportHarness
        onValue={value => {
          observedValues.push(value);
        }}
      />
    );

    emitResize(800, 600);

    await waitFor(() => {
      expect(observedValues.at(-1)?.containerSize).toEqual({
        width: 800,
        height: 600,
      });
    });

    emitResize(1024, 768);

    await waitFor(() => {
      expect(observedValues.at(-1)?.containerSize).toEqual({
        width: 1024,
        height: 768,
      });
    });
  });

  it('zooms the canvas when wheel events come from the canvas viewport', async () => {
    const observedValues: ReturnType<typeof useCanvasViewport>[] = [];

    render(
      <ViewportHarness
        onValue={value => {
          observedValues.push(value);
        }}
      />
    );

    fireEvent.wheel(screen.getByTestId('viewport'), { deltaY: 100 });

    await waitFor(() => {
      expect(observedValues.at(-1)?.imageScale).toBeCloseTo(0.95);
    });
  });

  it('lets wheel events inside overlay panels scroll without zooming the canvas', async () => {
    const observedValues: ReturnType<typeof useCanvasViewport>[] = [];

    render(
      <ViewportHarness
        includeWheelBlocker
        onValue={value => {
          observedValues.push(value);
        }}
      />
    );

    fireEvent.wheel(screen.getByTestId('wheel-blocker'), { deltaY: 100 });

    await waitFor(() => {
      expect(observedValues.at(-1)?.imageScale).toBe(1);
    });
  });
});
