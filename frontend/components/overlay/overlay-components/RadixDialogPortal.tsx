'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef } from 'react';
import { useOverlayContainer } from '../OverlayProvider';

type RadixDialogPortalProps = Omit<
  ComponentPropsWithoutRef<typeof Dialog.Portal>,
  'container'
>;

export default function RadixDialogPortal(props: RadixDialogPortalProps) {
  const overlayContainer = useOverlayContainer();

  if (!overlayContainer.shouldRenderPortal) return null;

  return (
    <Dialog.Portal
      {...props}
      container={overlayContainer.container}
    />
  );
}
