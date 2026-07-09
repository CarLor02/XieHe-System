'use client';

import type { ReactNode, SyntheticEvent } from 'react';
import OverlayPortal from './OverlayPortal';
import type { OverlayLayer } from './overlayLayers';

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
  if (!open) return null;

  const stopOverlayEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <OverlayPortal
      layer={layer}
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      onMouseDown={stopOverlayEvent}
      onClick={stopOverlayEvent}
      onMouseUp={stopOverlayEvent}
      onMouseMove={stopOverlayEvent}
    >
      <div className="w-80 rounded-lg border border-gray-600 bg-gray-900 p-4 shadow-2xl">
        <div className="text-sm text-white">{message}</div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded bg-blue-600 px-3 text-xs text-white hover:bg-blue-500"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
