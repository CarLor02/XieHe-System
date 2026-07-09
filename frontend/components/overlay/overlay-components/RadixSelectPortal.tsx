'use client';

import * as Select from '@radix-ui/react-select';
import type { ComponentPropsWithoutRef } from 'react';
import { useOverlayContainer } from '../OverlayProvider';

type RadixSelectPortalProps = Omit<
  ComponentPropsWithoutRef<typeof Select.Portal>,
  'container'
>;

export default function RadixSelectPortal(props: RadixSelectPortalProps) {
  const overlayContainer = useOverlayContainer();

  if (!overlayContainer.shouldRenderPortal) return null;

  return (
    <Select.Portal
      {...props}
      container={overlayContainer.container}
    />
  );
}
