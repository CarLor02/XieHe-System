import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import type { Point } from '@xiehe/imaging-core/contracts';
import type { CanvasPointerInput } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/input/pointer-input';
import { useCanvasPointerEvents } from './useCanvasPointerEvents';

class PointerEventMock extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? 'mouse';
    this.isPrimary = init.isPrimary ?? false;
  }
}

interface HarnessProps {
  canStartPinch?: () => boolean;
  imageScale?: number;
  imagePosition?: Point;
  onPointerDown?: jest.Mock;
  onPointerMove?: jest.Mock;
  onPointerEnd?: jest.Mock;
  onPinchStart?: jest.Mock;
  onPinchViewportChange?: jest.Mock;
}

function PointerHarness({
  canStartPinch = () => true,
  imageScale = 1,
  imagePosition = { x: 0, y: 0 },
  onPointerDown = jest.fn(),
  onPointerMove = jest.fn(),
  onPointerEnd = jest.fn(),
  onPinchStart = jest.fn(),
  onPinchViewportChange = jest.fn(),
}: HarnessProps) {
  const handlers = useCanvasPointerEvents({
    imageScale,
    imagePosition,
    canStartPinch,
    onPinchStart,
    onPinchViewportChange,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onHoverEnter: jest.fn(),
    onHoverLeave: jest.fn(),
  });

  return <div data-testid="surface" {...handlers} />;
}

function prepareSurface() {
  const surface = screen.getByTestId('surface');
  const captured = new Set<number>();
  Object.defineProperties(surface, {
    getBoundingClientRect: {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
    setPointerCapture: {
      configurable: true,
      value: (pointerId: number) => captured.add(pointerId),
    },
    hasPointerCapture: {
      configurable: true,
      value: (pointerId: number) => captured.has(pointerId),
    },
    releasePointerCapture: {
      configurable: true,
      value: (pointerId: number) => captured.delete(pointerId),
    },
  });
  return { surface, captured };
}

describe('useCanvasPointerEvents', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'PointerEvent', {
      configurable: true,
      value: PointerEventMock,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches hover for mouse but not for an inactive touch pointer', () => {
    const onPointerMove = jest.fn();
    render(<PointerHarness onPointerMove={onPointerMove} />);
    const { surface } = prepareSurface();

    fireEvent.pointerMove(surface, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 30,
      clientY: 40,
      buttons: 0,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 50,
      clientY: 60,
      buttons: 0,
    });

    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(onPointerMove.mock.calls[0][0]).toMatchObject({
      pointerType: 'mouse',
      primaryActionPressed: false,
      screenPoint: { x: 30, y: 40 },
    });
  });

  it('captures a touch pointer and completes it exactly once', () => {
    const onPointerDown = jest.fn();
    const onPointerMove = jest.fn();
    const onPointerEnd = jest.fn();
    render(
      <PointerHarness
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerEnd={onPointerEnd}
      />
    );
    const { surface, captured } = prepareSurface();

    fireEvent.pointerDown(surface, {
      pointerId: 4,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 100,
      clientY: 120,
      buttons: 1,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 4,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 130,
      clientY: 150,
      buttons: 1,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 4,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 130,
      clientY: 150,
      buttons: 0,
    });
    fireEvent.lostPointerCapture(surface, { pointerId: 4 });

    const input = onPointerDown.mock.calls[0][0] as CanvasPointerInput;
    expect(input.policy.pointHitRadius).toBe(22);
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(onPointerEnd).toHaveBeenCalledTimes(1);
    expect(captured.size).toBe(0);
  });

  it('switches an eligible two-touch gesture to anchored pinch zoom', () => {
    const onPinchStart = jest.fn();
    const onPinchViewportChange = jest.fn();
    render(
      <PointerHarness
        onPinchStart={onPinchStart}
        onPinchViewportChange={onPinchViewportChange}
      />
    );
    const { surface } = prepareSurface();

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 50,
      clientY: 100,
      buttons: 1,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 150,
      clientY: 100,
      buttons: 1,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 300,
      clientY: 200,
      buttons: 1,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 350,
      clientY: 250,
      buttons: 1,
    });
    expect(onPinchViewportChange).not.toHaveBeenCalled();

    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 250,
      clientY: 100,
      buttons: 1,
    });

    expect(onPinchStart).toHaveBeenCalledTimes(1);
    expect(onPinchViewportChange).toHaveBeenLastCalledWith({
      imageScale: 2,
      imagePosition: { x: 150, y: 50 },
    });
  });
});
