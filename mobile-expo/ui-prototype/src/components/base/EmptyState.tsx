interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionText?: string;
  actionIcon?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionIcon = 'ri-refresh-line',
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[52vh] px-6 py-10">
      {/* 插画区：渐变光晕 + 图标 + 装饰点 */}
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-100 via-slate-50 to-purple-100 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-white shadow-lg shadow-slate-200/70 flex items-center justify-center">
            <i className={`${icon} text-5xl text-violet-300`}></i>
          </div>
        </div>
        <div className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-violet-200/70"></div>
        <div className="absolute bottom-2 -left-1 w-3 h-3 rounded-full bg-purple-100"></div>
        <div className="absolute top-8 -left-3 w-2 h-2 rounded-full bg-slate-200"></div>
        <div className="absolute -bottom-1 right-8 w-2 h-2 rounded-full bg-slate-100"></div>
      </div>

      <h3 className="text-base font-bold text-slate-700 mb-2">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mb-6">{description}</p>
      )}

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-violet-400/30 active:scale-95 transition-all flex items-center gap-2"
        >
          <i className={`${actionIcon} text-base`}></i>
          {actionText}
        </button>
      )}
    </div>
  );
}