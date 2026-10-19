interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 bg-white/95 backdrop-blur-sm border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg shadow-violet-900/20 placeholder:text-slate-400"
      />
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
        <i className="ri-search-line text-slate-500 text-sm"></i>
      </div>
    </div>
  );
}