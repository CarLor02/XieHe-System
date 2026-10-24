export type StatusTagTone =
  | 'violet'
  | 'sky'
  | 'teal'
  | 'indigo'
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'slate'
  | 'pink'
  | 'orange'
  | 'red';

const tones: Record<StatusTagTone, { bg: string; text: string; dot: string }> = {
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-400' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-400' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-500', dot: 'bg-rose-400' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', dot: 'bg-pink-400' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500', dot: 'bg-orange-400' },
  red: { bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-400' },
};

interface StatusTagProps {
  label: string;
  tone?: StatusTagTone;
  dot?: boolean;
}

export default function StatusTag({ label, tone = 'slate', dot = false }: StatusTagProps) {
  const t = tones[tone];
  return (
    <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full flex items-center gap-1 ${t.bg} ${t.text}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full inline-block ${t.dot}`}></span>}
      {label}
    </span>
  );
}