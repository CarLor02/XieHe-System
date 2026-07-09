'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode, SyntheticEvent } from 'react';
import { cn } from '@/lib/utils';
import { OverlayScopeProvider } from '../../OverlayProvider';
import {
  OVERLAY_LAYER_CLASS_NAMES,
  type OverlayLayer,
} from '../../overlayLayers';
import { RadixDialogPortal } from '../radix';

interface AppModalProps {
  open: boolean;
  children: ReactNode;
  title?: ReactNode;
  layer?: OverlayLayer;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
}

function stopOverlayEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

export default function AppModal({
  open,
  children,
  title = '模态窗口',
  layer = 'modal',
  onOpenChange,
  closeOnEscape = false,
  closeOnInteractOutside = false,
  overlayClassName,
  contentClassName,
}: AppModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialogPortal>
        <Dialog.Overlay
          data-overlay-layer={layer}
          className={cn(
            OVERLAY_LAYER_CLASS_NAMES[layer],
            'fixed inset-0 bg-slate-900/45',
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
            'fixed inset-0 flex items-center justify-center px-2 py-4 outline-none sm:px-6 sm:py-8',
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
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {/* Keep nested dropdown/select portals inside the Radix modal content. */}
          <OverlayScopeProvider>{children}</OverlayScopeProvider>
        </Dialog.Content>
      </RadixDialogPortal>
    </Dialog.Root>
  );
}
