import type { ExportContentType } from '../domain';
import type { ExportContentOption } from '../hooks/use-export-content-options';

interface BatchExportControlsProps {
  exportContent: ExportContentType;
  exportContentOptions: ExportContentOption[];
  selectedCount: number;
  isExporting: boolean;
  exportProgress: number;
  exportMessage: string;
  onChangeExportContent: (value: ExportContentType) => void;
  onClearSelection: () => void;
  onExit: () => void;
  onStartExport: () => void;
}

export default function BatchExportControls({
  exportContent,
  exportContentOptions,
  selectedCount,
  isExporting,
  exportProgress,
  exportMessage,
  onChangeExportContent,
  onClearSelection,
  onExit,
  onStartExport,
}: BatchExportControlsProps) {
  const isSuccessMessage = exportMessage.includes('成功');

  return (
    <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,420px)_auto] sm:items-end">
          <div>
            <label
              htmlFor="imaging-batch-export-content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              导出内容
            </label>
            <select
              id="imaging-batch-export-content"
              value={exportContent}
              onChange={event =>
                onChangeExportContent(event.target.value as ExportContentType)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exportContentOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!exportContentOptions.some(option => option.value === 'annotation-points') && (
              <p className="text-xs text-gray-500 mt-2">
                非管理员账号不可导出标注点检测数据
              </p>
            )}
          </div>

          <div className="text-sm font-medium text-blue-700 sm:pb-2">
            已选 {selectedCount} 张影像
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={selectedCount === 0 || isExporting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            清空选择
          </button>
          <button
            type="button"
            onClick={onExit}
            disabled={isExporting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            退出导出
          </button>
          <button
            type="button"
            onClick={onStartExport}
            disabled={selectedCount === 0 || isExporting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isExporting ? `导出中... ${exportProgress}%` : '进行导出'}
          </button>
        </div>
      </div>

      {isExporting && (
        <div className="mt-4 h-2 w-full rounded-full bg-blue-100">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}

      {exportMessage && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            isSuccessMessage
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {exportMessage}
        </div>
      )}
    </div>
  );
}
