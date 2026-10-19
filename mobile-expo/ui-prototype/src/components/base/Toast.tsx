interface ToastProps {
  message: string;
  icon?: string;
  tone?: 'success' | 'info';
}

export default function Toast({ message, icon, tone = 'success' }: ToastProps) {
  if (!message) return null;

  const iconClass = icon || (tone === 'success' ? 'ri-checkbox-circle-fill' : 'ri-information-fill');
  const iconColor = tone === 'success' ? 'text-emerald-400' : 'text-sky-300';

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap max-w-[90vw]">
      <i className={`${iconClass} ${iconColor}`}></i>
      <span className="truncate">{message}</span>
    </div>
  );
}