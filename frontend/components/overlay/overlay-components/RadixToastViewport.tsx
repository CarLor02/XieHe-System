'use client';

import * as Toast from '@radix-ui/react-toast';
import type { ComponentPropsWithoutRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { OVERLAY_LAYER_CLASS_NAMES } from '../overlayLayers';
import { useOverlayContainer } from '../OverlayProvider';

type RadixToastViewportProps = ComponentPropsWithoutRef<typeof Toast.Viewport>;

export default function RadixToastViewport({
  className,
  ...props
}: RadixToastViewportProps) {
  const overlayContainer = useOverlayContainer();
  const viewport = (
    <Toast.Viewport
      {...props}
      data-overlay-layer="toast"
      className={cn(OVERLAY_LAYER_CLASS_NAMES.toast, className)}
    />
  );

  if (!overlayContainer.shouldRenderPortal) return null;
  if (overlayContainer.type === 'outside-provider') return viewport;

  return createPortal(viewport, overlayContainer.container);
}
