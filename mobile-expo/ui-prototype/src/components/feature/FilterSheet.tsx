interface FilterSheetProps {
  open: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (option: string) => void;
  onClose: () => void;
}

export default function FilterSheet({ open, title, options, value, onSelect, onClose }: FilterSheetProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-6 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"></div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onSelect(option);
                onClose();
              }}
              className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all ${
                value === option
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-4 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium">
          取消
        </button>
      </div>
    </div>
  );
}