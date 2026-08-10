interface CobbEndpointSelectionPanelProps {
  title: string;
  upperOptions: readonly string[];
  lowerOptions: readonly string[];
  upperVertebra: string;
  lowerVertebra: string;
  allowPending: boolean;
  applyLabel: string;
  canApply: boolean;
  onUpperChange: (value: string) => void;
  onLowerChange: (value: string) => void;
  onCancel: () => void;
  onApply: () => void;
}

export default function CobbEndpointSelectionPanel({
  title,
  upperOptions,
  lowerOptions,
  upperVertebra,
  lowerVertebra,
  allowPending,
  applyLabel,
  canApply,
  onUpperChange,
  onLowerChange,
  onCancel,
  onApply,
}: CobbEndpointSelectionPanelProps) {
  const renderOptions = (
    options: readonly string[],
    disabledVertebra: string
  ) => (
    <>
      {allowPending && <option value="">待定</option>}
      {options.map(vertebra => (
        <option
          key={vertebra}
          value={vertebra}
          disabled={vertebra === disabledVertebra}
        >
          {vertebra}
        </option>
      ))}
    </>
  );

  return (
    <div className="relative z-40 mt-2 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto rounded-lg border border-gray-600 bg-gray-900 p-3 shadow-xl">
      <div className="mb-3 text-xs text-gray-300">{title}</div>
      <div className="space-y-3">
        <label className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs text-gray-300">
          <span>上端椎</span>
          <select
            aria-label="上端椎"
            value={upperVertebra}
            onChange={event => onUpperChange(event.target.value)}
            className="h-8 rounded border border-gray-600 bg-gray-800 px-2 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          >
            {renderOptions(upperOptions, lowerVertebra)}
          </select>
        </label>
        <label className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs text-gray-300">
          <span>下端椎</span>
          <select
            aria-label="下端椎"
            value={lowerVertebra}
            onChange={event => onLowerChange(event.target.value)}
            className="h-8 rounded border border-gray-600 bg-gray-800 px-2 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          >
            {renderOptions(lowerOptions, upperVertebra)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded bg-gray-700 px-3 text-xs text-gray-300 hover:bg-gray-600"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          className={`h-8 rounded px-3 text-xs ${
            canApply
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'cursor-not-allowed bg-gray-700 text-gray-500'
          }`}
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}
