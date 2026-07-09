'use client';

import type { ReactNode } from 'react';
import type { OverlayLayer } from '../../../overlayLayers';
import AppDialog from '../AppDialog';

interface AppConfirmDialogProps {
  open: boolean;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  layer?: OverlayLayer;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AppConfirmDialog({
  open,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  confirmDisabled = false,
  layer = 'modal',
  onConfirm,
  onCancel,
}: AppConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      layer={layer}
      title="确认"
      bodyClassName="text-sm text-white"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded bg-gray-700 px-3 text-xs text-white hover:bg-gray-600"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="h-8 rounded bg-blue-600 px-3 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {message}
    </AppDialog>
  );
}
