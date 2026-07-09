'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef } from 'react';
import { useOverlayContainer } from '../OverlayProvider';

type RadixTooltipPortalProps = Omit<
  ComponentPropsWithoutRef<typeof Tooltip.Portal>,
  'container'
>;

export default function RadixTooltipPortal(props: RadixTooltipPortalProps) {
  const overlayContainer = useOverlayContainer();

  if (!overlayContainer.shouldRenderPortal) return null;

  return (
    <Tooltip.Portal
      {...props}
      container={overlayContainer.container}
    />
  );
}
