'use client';

interface ReportPanelProps {
  reportText: string;
  onCopy: () => void;
}

export default function ReportPanel({
  reportText,
  onCopy,
}: ReportPanelProps) {
  if (!reportText) return null;

  return (
    <div className="mb-4">
      <div className="bg-gray-700/50 rounded-lg p-3 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white flex items-center">
            <i className="ri-file-text-line w-4 h-4 mr-1"></i>
            分析报告
          </h4>
          <button
            onClick={onCopy}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
          >
            <i className="ri-file-copy-line w-3 h-3 mr-1"></i>
            复制
          </button>
        </div>
        {/* Markdown渲染区域 */}
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
            {reportText}
          </div>
          {/* TODO: 安装 react-markdown 和 remark-gfm 包后启用 Markdown 渲染 */}
        </div>
      </div>
    </div>
  );
}

