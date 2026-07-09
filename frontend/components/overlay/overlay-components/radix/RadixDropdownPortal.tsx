'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef } from 'react';
import { useOverlayContainer } from '../../OverlayProvider';

type RadixDropdownPortalProps = Omit<
  ComponentPropsWithoutRef<typeof DropdownMenu.Portal>,
  'container'
>;

export default function RadixDropdownPortal(props: RadixDropdownPortalProps) {
  const overlayContainer = useOverlayContainer();

  if (!overlayContainer.shouldRenderPortal) return null;

  return (
    <DropdownMenu.Portal
      {...props}
      container={overlayContainer.container}
    />
  );
}
