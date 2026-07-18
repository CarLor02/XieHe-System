'use client';

import * as Popover from '@radix-ui/react-popover';
import type { ComponentPropsWithoutRef } from 'react';
import { useOverlayContainer } from '../../OverlayProvider';

type RadixPopoverPortalProps = Omit<
  ComponentPropsWithoutRef<typeof Popover.Portal>,
  'container'
>;

export default function RadixPopoverPortal(props: RadixPopoverPortalProps) {
  const overlayContainer = useOverlayContainer();

  if (!overlayContainer.shouldRenderPortal) return null;

  return (
    <Popover.Portal
      {...props}
      container={overlayContainer.container}
    />
  );
}
