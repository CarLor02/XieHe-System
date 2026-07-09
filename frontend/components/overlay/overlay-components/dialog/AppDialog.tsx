'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode, SyntheticEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  OVERLAY_LAYER_CLASS_NAMES,
  type OverlayLayer,
} from '../../overlayLayers';
import { RadixDialogPortal } from '../radix';

interface AppDialogProps {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  layer?: OverlayLayer;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

function stopOverlayEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

export default function AppDialog({
  open,
  title = '提示',
  children,
  footer,
  layer = 'modal',
  onOpenChange,
  closeOnEscape = false,
  closeOnInteractOutside = false,
  overlayClassName,
  contentClassName,
  titleClassName,
  bodyClassName,
  footerClassName,
}: AppDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialogPortal>
        <Dialog.Overlay
          data-overlay-layer={layer}
          className={cn(
            OVERLAY_LAYER_CLASS_NAMES[layer],
            'fixed inset-0 bg-black/40',
            overlayClassName
          )}
          onMouseDown={stopOverlayEvent}
          onClick={stopOverlayEvent}
          onMouseUp={stopOverlayEvent}
          onMouseMove={stopOverlayEvent}
        />
        <Dialog.Content
          data-overlay-layer={layer}
          className={cn(
            OVERLAY_LAYER_CLASS_NAMES[layer],
            'fixed left-1/2 top-1/2 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-600 bg-gray-900 p-4 shadow-2xl outline-none',
            contentClassName
          )}
          onEscapeKeyDown={event => {
            if (!closeOnEscape) event.preventDefault();
          }}
          onInteractOutside={event => {
            if (!closeOnInteractOutside) event.preventDefault();
          }}
          onMouseDown={stopOverlayEvent}
          onClick={stopOverlayEvent}
          onMouseUp={stopOverlayEvent}
          onMouseMove={stopOverlayEvent}
        >
          <Dialog.Title className={cn('sr-only', titleClassName)}>
            {title}
          </Dialog.Title>
          <div className={bodyClassName}>{children}</div>
          {footer && (
            <div className={cn('mt-4 flex justify-end gap-2', footerClassName)}>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </RadixDialogPortal>
    </Dialog.Root>
  );
}
