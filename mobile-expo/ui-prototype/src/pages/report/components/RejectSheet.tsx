import { useState } from 'react';

interface RejectSheetProps {
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function RejectSheet({ onClose, onConfirm }: RejectSheetProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl flex items-center justify-center">
              <i className="ri-close-circle-line text-white text-lg"></i>
            </div>
            <div>
              <h2 className="text-slate-800 font-semibold text-base">驳回报告</h2>
              <p className="text-slate-400 text-xs">请填写驳回原因，便于医生修改</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">
            <i className="ri-close-line text-slate-500"></i>
          </button>
        </div>

        <div className="px-4 py-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：结论描述需补充 Cobb 角进展趋势说明…"
            maxLength={500}
            rows={4}
            className="w-full resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-rose-400 placeholder:text-slate-300"
          />
          <p className="text-right text-[10px] text-slate-400 mt-1">{reason.length}/500</p>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              reason.trim()
                ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-400/30'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="ri-close-circle-fill text-base"></i>
            确认驳回
          </button>
        </div>
      </div>
    </div>
  );
}