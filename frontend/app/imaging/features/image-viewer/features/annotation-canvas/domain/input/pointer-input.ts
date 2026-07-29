import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export type CanvasPointerType = 'mouse' | 'touch' | 'pen';

export interface CanvasPointerPolicy {
  supportsHover: boolean;
  pointHitRadius: number;
  lineHitRadius: number;
  selectionPadding: number;
  dragStartThreshold: number;
}

export interface CanvasPointerInput {
  pointerId: number;
  pointerType: CanvasPointerType;
  isPrimary: boolean;
  clientPoint: Point;
  screenPoint: Point;
  primaryActionPressed: boolean;
  policy: CanvasPointerPolicy;
}

const POINTER_POLICIES: Record<CanvasPointerType, CanvasPointerPolicy> = {
  mouse: {
    supportsHover: true,
    pointHitRadius: 10,
    lineHitRadius: 8,
    selectionPadding: 15,
    dragStartThreshold: 3,
  },
  touch: {
    supportsHover: false,
    pointHitRadius: 22,
    lineHitRadius: 14,
    selectionPadding: 22,
    dragStartThreshold: 6,
  },
  pen: {
    supportsHover: true,
    pointHitRadius: 12,
    lineHitRadius: 10,
    selectionPadding: 15,
    dragStartThreshold: 3,
  },
};

export function normalizeCanvasPointerType(
  pointerType: string
): CanvasPointerType {
  if (pointerType === 'touch' || pointerType === 'pen') {
    return pointerType;
  }
  return 'mouse';
}

export function getCanvasPointerPolicy(
  pointerType: CanvasPointerType
): CanvasPointerPolicy {
  return POINTER_POLICIES[pointerType];
}
