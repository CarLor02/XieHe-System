'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  OVERLAY_LAYER_CLASS_NAMES,
  type OverlayLayer,
} from './overlayLayers';
import { useOverlayHostElement } from './OverlayProvider';

interface OverlayPortalProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  layer?: OverlayLayer;
}

function getBodyElement() {
  return typeof document === 'undefined' ? null : document.body;
}

export default function OverlayPortal({
  children,
  layer = 'modal',
  className,
  ...props
}: OverlayPortalProps) {
  const hostElement = useOverlayHostElement();
  const target = hostElement === undefined ? getBodyElement() : hostElement;

  if (!target) return null;

  return createPortal(
    <div
      data-overlay-layer={layer}
      className={cn(OVERLAY_LAYER_CLASS_NAMES[layer], className)}
      {...props}
    >
      {children}
    </div>,
    target
  );
}
