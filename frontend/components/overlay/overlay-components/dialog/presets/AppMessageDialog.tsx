'use client';

import type { ReactNode } from 'react';
import type { OverlayLayer } from '../../../overlayLayers';
import AppDialog from '../AppDialog';

interface AppMessageDialogProps {
  open: boolean;
  message: ReactNode;
  buttonLabel?: string;
  layer?: OverlayLayer;
  onClose: () => void;
}

export default function AppMessageDialog({
  open,
  message,
  buttonLabel = '知道了',
  layer = 'modal',
  onClose,
}: AppMessageDialogProps) {
  return (
    <AppDialog
      open={open}
      layer={layer}
      title="提示"
      bodyClassName="text-sm text-white"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-8 rounded bg-blue-600 px-3 text-xs text-white hover:bg-blue-500"
        >
          {buttonLabel}
        </button>
      }
    >
      {message}
    </AppDialog>
  );
}
