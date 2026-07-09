'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';
import { RadixDropdownPortal } from '@/components/overlay/overlay-components/radix';
import { OVERLAY_LAYER_CLASS_NAMES } from '@/components/overlay/overlayLayers';
import { cn } from '@/lib/utils';

type DropdownContentProps = ComponentPropsWithoutRef<typeof DropdownMenu.Content>;

interface AppDropdownProps {
  trigger: ReactElement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
  side?: DropdownContentProps['side'];
  align?: DropdownContentProps['align'];
  sideOffset?: number;
  collisionPadding?: DropdownContentProps['collisionPadding'];
  modal?: boolean;
}

export default function AppDropdown({
  trigger,
  children,
  open,
  onOpenChange,
  contentClassName = '',
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  collisionPadding = 8,
  modal = false,
}: AppDropdownProps) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <RadixDropdownPortal>
        <DropdownMenu.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            OVERLAY_LAYER_CLASS_NAMES.dropdown,
            'rounded-lg border border-gray-200 bg-white shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            contentClassName
          )}
        >
          {children}
        </DropdownMenu.Content>
      </RadixDropdownPortal>
    </DropdownMenu.Root>
  );
}
