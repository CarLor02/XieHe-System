import { useCallback, useRef } from 'react';

import {
  getCanvasPointerPolicy,
  normalizeCanvasPointerType,
  type CanvasPointerInput,
} from '@xiehe/imaging-core/canvas';
import {
  calculatePinchViewport,
  getPointerDistance,
  getPointerMidpoint,
  type PinchSnapshot,
} from '@xiehe/imaging-core/canvas';
import type { Point } from '@xiehe/imaging-core/contracts';

interface PinchState {
  pointerIds: readonly [number, number];
  snapshot: PinchSnapshot;
}

interface UseCanvasPointerEventsOptions {
  imageScale: number;
  imagePosition: Point;
  canStartPinch: () => boolean;
  onPinchStart: () => void;
  onPinchViewportChange: (viewport: {
    imageScale: number;
    imagePosition: Point;
  }) => void;
  onPointerDown: (input: CanvasPointerInput) => void;
  onPointerMove: (input: CanvasPointerInput) => void;
  onPointerEnd: (pointerId: number) => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}

function isPrimaryActionPressed(event: React.PointerEvent): boolean {
  return (event.buttons & 1) === 1;
}

/**
 * 浏览器 Pointer Events 适配层。
 *
 * 这里负责 DOM 坐标、Pointer Capture 和多指生命周期；下游只接收规范化输入，
 * 不感知 React 事件，也不会分别维护 mouse/touch 两套状态机。
 */
export function useCanvasPointerEvents({
  imageScale,
  imagePosition,
  canStartPinch,
  onPinchStart,
  onPinchViewportChange,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onHoverEnter,
  onHoverLeave,
}: UseCanvasPointerEventsOptions) {
  const activePointersRef = useRef(new Map<number, CanvasPointerInput>());
  const primaryPointerIdRef = useRef<number | null>(null);
  const pinchStateRef = useRef<PinchState | null>(null);
  const suppressSinglePointerRef = useRef(false);

  const toInput = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      primaryActionPressed = isPrimaryActionPressed(event)
    ): CanvasPointerInput => {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerType = normalizeCanvasPointerType(event.pointerType);
      return {
        pointerId: event.pointerId,
        pointerType,
        isPrimary: event.isPrimary,
        clientPoint: { x: event.clientX, y: event.clientY },
        screenPoint: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        primaryActionPressed,
        policy: getCanvasPointerPolicy(pointerType),
      };
    },
    []
  );

  const capturePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture may already have been lost during browser cancellation.
      }
    },
    []
  );

  const releasePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Releasing an already-lost capture is harmless.
      }
    },
    []
  );

  const tryStartPinch = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      input: CanvasPointerInput
    ): boolean => {
      if (
        input.pointerType !== 'touch' ||
        pinchStateRef.current ||
        suppressSinglePointerRef.current ||
        !canStartPinch()
      ) {
        return false;
      }

      const firstEntry = [...activePointersRef.current.entries()].find(
        ([, active]) => active.pointerType === 'touch'
      );
      if (!firstEntry) return false;

      const [firstPointerId, firstInput] = firstEntry;
      const rect = event.currentTarget.getBoundingClientRect();
      const distance = getPointerDistance(
        firstInput.screenPoint,
        input.screenPoint
      );
      if (distance <= 0) return false;

      onPinchStart();
      pinchStateRef.current = {
        pointerIds: [firstPointerId, input.pointerId],
        snapshot: {
          distance,
          midpoint: getPointerMidpoint(
            firstInput.screenPoint,
            input.screenPoint
          ),
          imageScale,
          imagePosition,
          containerCenter: {
            x: rect.width / 2,
            y: rect.height / 2,
          },
        },
      };
      primaryPointerIdRef.current = null;
      suppressSinglePointerRef.current = true;
      return true;
    },
    [canStartPinch, imagePosition, imageScale, onPinchStart]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const input = toInput(event, true);
      if (input.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      event.preventDefault();
      capturePointer(event);

      if (tryStartPinch(event, input)) {
        activePointersRef.current.set(input.pointerId, input);
        return;
      }

      activePointersRef.current.set(input.pointerId, input);
      if (
        primaryPointerIdRef.current !== null ||
        suppressSinglePointerRef.current
      ) {
        return;
      }

      primaryPointerIdRef.current = input.pointerId;
      onPointerDown(input);
    },
    [capturePointer, onPointerDown, toInput, tryStartPinch]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const input = toInput(event);
      if (activePointersRef.current.has(input.pointerId)) {
        activePointersRef.current.set(input.pointerId, input);
      }

      const pinchState = pinchStateRef.current;
      if (pinchState) {
        const [firstId, secondId] = pinchState.pointerIds;
        if (input.pointerId !== firstId && input.pointerId !== secondId) {
          return;
        }
        const first = activePointersRef.current.get(firstId);
        const second = activePointersRef.current.get(secondId);
        if (first && second) {
          event.preventDefault();
          onPinchViewportChange(
            calculatePinchViewport(
              pinchState.snapshot,
              first.screenPoint,
              second.screenPoint
            )
          );
        }
        return;
      }

      if (primaryPointerIdRef.current === input.pointerId) {
        event.preventDefault();
        onPointerMove(input);
        return;
      }

      if (
        primaryPointerIdRef.current === null &&
        !suppressSinglePointerRef.current &&
        input.policy.supportsHover
      ) {
        onPointerMove(input);
      }
    },
    [onPinchViewportChange, onPointerMove, toInput]
  );

  const finishPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pointerId = event.pointerId;
      if (!activePointersRef.current.has(pointerId)) return;

      const wasPrimary = primaryPointerIdRef.current === pointerId;
      const pinchState = pinchStateRef.current;

      activePointersRef.current.delete(pointerId);
      if (pinchState?.pointerIds.includes(pointerId)) {
        pinchStateRef.current = null;
      }

      if (wasPrimary) {
        primaryPointerIdRef.current = null;
      }

      releasePointer(event);

      if (wasPrimary) {
        onPointerEnd(pointerId);
      }

      if (activePointersRef.current.size === 0) {
        suppressSinglePointerRef.current = false;
        pinchStateRef.current = null;
      }
    },
    [onPointerEnd, releasePointer]
  );

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const input = toInput(event);
      if (input.policy.supportsHover) onHoverEnter();
    },
    [onHoverEnter, toInput]
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const input = toInput(event);
      if (input.policy.supportsHover) onHoverLeave();
    },
    [onHoverLeave, toInput]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onLostPointerCapture: finishPointer,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
  };
}
