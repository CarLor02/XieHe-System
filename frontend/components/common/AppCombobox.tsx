'use client';

import * as Popover from '@radix-ui/react-popover';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';
import { RadixPopoverPortal } from '@/components/overlay/overlay-components/radix';
import { OVERLAY_LAYER_CLASS_NAMES } from '@/components/overlay/overlayLayers';
import { cn } from '@/lib/utils';

type PopoverContentProps = ComponentPropsWithoutRef<typeof Popover.Content>;

interface AppComboboxProps {
  trigger: ReactElement;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentClassName?: string;
  side?: PopoverContentProps['side'];
  align?: PopoverContentProps['align'];
  sideOffset?: number;
  collisionPadding?: PopoverContentProps['collisionPadding'];
}

export default function AppCombobox({
  trigger,
  children,
  open,
  onOpenChange,
  contentClassName,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  collisionPadding = 8,
}: AppComboboxProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <RadixPopoverPortal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            OVERLAY_LAYER_CLASS_NAMES.popover,
            'rounded-lg border border-gray-200 bg-white shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            contentClassName
          )}
        >
          {children}
        </Popover.Content>
      </RadixPopoverPortal>
    </Popover.Root>
  );
}
