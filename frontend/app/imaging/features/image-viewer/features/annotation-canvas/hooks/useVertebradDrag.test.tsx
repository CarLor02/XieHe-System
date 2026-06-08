import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { describe, expect, it, jest } from '@jest/globals';

import { AnnotationSource, VertebraAnnotation } from '@/app/imaging/features/image-viewer/shared/types';
import { useVertebradDrag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hooks/useVertebradDrag';

function createT1Layer(): VertebraAnnotation[] {
  return [
    {
      label: 'T1',
      corners: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      confidence: 1,
      source: AnnotationSource.AI,
    },
  ];
}

type DragHook = ReturnType<typeof useVertebradDrag>;

function DragHarness({
  onValue,
  onVertebraeUpdate,
  onAnnotationDragStart = jest.fn(),
}: {
  onValue: (value: DragHook) => void;
  onVertebraeUpdate: (updated: VertebraAnnotation[]) => void;
  onAnnotationDragStart?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const value = useVertebradDrag({
    vertebraeLayer: createT1Layer(),
    imageToScreen: point => point,
    screenToImage: (screenX, screenY) => ({ x: screenX, y: screenY }),
    onVertebraeUpdate,
    onLiveLayerChange: jest.fn(),
    containerRef,
    onHoverChange: jest.fn(),
    onAnnotationDragStart,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
      }) as DOMRect;
  }, []);

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return <div ref={containerRef} />;
}

function NestedPreviewHarness({
  onValue,
  onVertebraeUpdate,
}: {
  onValue: (value: DragHook) => void;
  onVertebraeUpdate: (updated: VertebraAnnotation[]) => void;
}) {
  const [previewUpdates, setPreviewUpdates] = useState(0);

  return (
    <>
      <div data-testid="preview-updates">{previewUpdates}</div>
      <DragChildHarness
        onValue={onValue}
        onVertebraeUpdate={onVertebraeUpdate}
        onLiveLayerChange={() => setPreviewUpdates(value => value + 1)}
      />
    </>
  );
}

function DragChildHarness({
  onValue,
  onVertebraeUpdate,
  onLiveLayerChange,
}: {
  onValue: (value: DragHook) => void;
  onVertebraeUpdate: (updated: VertebraAnnotation[]) => void;
  onLiveLayerChange: (updated: VertebraAnnotation[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const value = useVertebradDrag({
    vertebraeLayer: createT1Layer(),
    imageToScreen: point => point,
    screenToImage: (screenX, screenY) => ({ x: screenX, y: screenY }),
    onVertebraeUpdate,
    onLiveLayerChange,
    containerRef,
    onHoverChange: jest.fn(),
  });

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
      }) as DOMRect;
  }, []);

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return <div ref={containerRef} />;
}

describe('useVertebradDrag', () => {
  it('drags a complete vertebra by clicking inside its frame', async () => {
    let latest: DragHook | null = null;
    let updatedLayer: VertebraAnnotation[] | null = null;
    const onVertebraeUpdate = jest.fn((updated: VertebraAnnotation[]) => {
      updatedLayer = updated;
    });

    render(
      <DragHarness
        onValue={value => {
          latest = value;
        }}
        onVertebraeUpdate={onVertebraeUpdate}
      />
    );

    await waitFor(() => {
      expect(latest).not.toBeNull();
    });

    act(() => {
      expect(latest!.handleMouseDown(150, 150)).toBe(true);
    });
    act(() => {
      latest!.handleMouseMove(180, 190);
    });
    act(() => {
      latest!.handleMouseUp();
    });

    await waitFor(() => {
      expect(onVertebraeUpdate).toHaveBeenCalledTimes(1);
    });

    const finalLayer = updatedLayer as VertebraAnnotation[] | null;
    if (!finalLayer) {
      throw new Error('Expected vertebrae layer to be updated');
    }

    expect(finalLayer[0].corners).toEqual([
      { x: 130, y: 140 },
      { x: 230, y: 140 },
      { x: 130, y: 240 },
      { x: 230, y: 240 },
    ]);
  });

  it('notifies whole-vertebra preview updates outside child state updaters', async () => {
    let latest: DragHook | null = null;
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      render(
        <NestedPreviewHarness
          onValue={value => {
            latest = value;
          }}
          onVertebraeUpdate={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(latest).not.toBeNull();
      });

      act(() => {
        expect(latest!.handleMouseDown(150, 150)).toBe(true);
      });
      act(() => {
        latest!.handleMouseMove(180, 190);
      });

      await waitFor(() => {
        expect(screen.getByTestId('preview-updates').textContent).toBe('1');
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('starts annotation history when a keypoint drag is accepted', async () => {
    let latest: DragHook | null = null;
    const onAnnotationDragStart = jest.fn();

    render(
      <DragHarness
        onValue={value => {
          latest = value;
        }}
        onVertebraeUpdate={jest.fn()}
        onAnnotationDragStart={onAnnotationDragStart}
      />
    );

    await waitFor(() => {
      expect(latest).not.toBeNull();
    });

    act(() => {
      expect(latest!.handleMouseDown(100, 100)).toBe(true);
    });

    expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);

    act(() => {
      latest!.handleMouseMove(110, 110);
    });

    expect(onAnnotationDragStart).toHaveBeenCalledTimes(1);
  });
});
