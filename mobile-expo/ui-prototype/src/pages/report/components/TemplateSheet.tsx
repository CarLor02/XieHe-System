import { useState } from 'react';
import { reportTemplates, ReportTemplate } from '@/mocks/reports';

interface TemplateSheetProps {
  onClose: () => void;
  onApply: (template: ReportTemplate) => void;
}

export default function TemplateSheet({ onClose, onApply }: TemplateSheetProps) {
  const [selected, setSelected] = useState<string>('');

  const handleApply = () => {
    const template = reportTemplates.find((t) => t.id === selected);
    if (template) {
      onApply(template);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <i className="ri-file-list-3-line text-white text-lg"></i>
            </div>
            <div>
              <h2 className="text-slate-800 font-semibold text-base">选择报告模板</h2>
              <p className="text-slate-400 text-xs">应用模板会填充印象、结论与建议</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">
            <i className="ri-close-line text-slate-500"></i>
          </button>
        </div>

        {/* 模板列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {reportTemplates.map((template) => {
            const active = selected === template.id;
            return (
              <button
                key={template.id}
                onClick={() => setSelected(template.id)}
                className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                  active
                    ? 'border-violet-400 bg-violet-50 shadow-md shadow-violet-100'
                    : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">{template.name}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      active ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {template.conclusion || '空白模板，清空当前印象、结论与建议内容'}
                </p>
              </button>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="px-4 py-4 border-t border-slate-100">
          <button
            onClick={handleApply}
            disabled={!selected}
            className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              selected
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-400/30'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="ri-check-line text-base"></i>
            应用模板
          </button>
        </div>
      </div>
    </div>
  );
}