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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/40"
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onMouseUp={event => event.stopPropagation()}
      onMouseMove={event => event.stopPropagation()}
    >
      <div className="w-80 rounded-lg border border-gray-600 bg-gray-900 p-4 shadow-2xl">
        <div className="text-sm text-white">{message}</div>
        <div className="mt-4 flex justify-end gap-2">
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
        </div>
      </div>
    </div>
  );
}
