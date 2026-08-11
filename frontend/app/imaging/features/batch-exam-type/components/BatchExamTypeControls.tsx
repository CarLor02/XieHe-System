import { EXAM_TYPES } from '@xiehe/imaging-core/image-files';

interface BatchExamTypeControlsProps {
  examType: string;
  selectedCount: number;
  isSetting: boolean;
  message: string;
  onChangeExamType: (value: string) => void;
  onClearSelection: () => void;
  onExit: () => void;
  onRequestSet: () => void;
}

export default function BatchExamTypeControls({
  examType,
  selectedCount,
  isSetting,
  message,
  onChangeExamType,
  onClearSelection,
  onExit,
  onRequestSet,
}: BatchExamTypeControlsProps) {
  const isSuccessMessage = message.includes('成功') || message.includes('无需');

  return (
    <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,420px)_auto] sm:items-end">
          <div>
            <label
              htmlFor="imaging-batch-exam-type"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              类型设置为
            </label>
            <select
              id="imaging-batch-exam-type"
              value={examType}
              onChange={event => onChangeExamType(event.target.value)}
              disabled={isSetting}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">请选择影像类型</option>
              {EXAM_TYPES.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm font-medium text-blue-700 sm:pb-2">
            已选 {selectedCount} 张影像
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={selectedCount === 0 || isSetting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            清空选择
          </button>
          <button
            type="button"
            onClick={onExit}
            disabled={isSetting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            退出设置
          </button>
          <button
            type="button"
            onClick={onRequestSet}
            disabled={selectedCount === 0 || !examType || isSetting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSetting ? '设置中...' : '进行设置'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            isSuccessMessage
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
