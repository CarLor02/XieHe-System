'use client';

import { AppConfirmDialog } from '@/components/overlay/overlay-components';

interface ImagingConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ImagingConfirmDialog({
  open,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ImagingConfirmDialogProps) {
  return (
    <AppConfirmDialog
      open={open}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmDisabled={confirmDisabled}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
