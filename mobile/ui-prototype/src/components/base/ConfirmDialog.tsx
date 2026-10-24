import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // 弹窗打开时锁定背景滚动，Android 返回键不做处理，仅阻止页面跟随滚动
  useEffect(() => {
    if (!open) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center px-8"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              danger ? 'bg-red-50' : 'bg-violet-50'
            }`}
          >
            <i className={`${danger ? 'ri-error-warning-line text-red-500' : 'ri-question-line text-violet-500'} text-2xl`}></i>
          </div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all ${
              danger ? 'bg-red-500 shadow-md shadow-red-200' : 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-md shadow-violet-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}