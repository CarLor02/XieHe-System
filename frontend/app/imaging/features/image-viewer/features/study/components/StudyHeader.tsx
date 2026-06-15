'use client';

import Link from 'next/link';

type HeaderImageData = {
  id: string;
  patientName: string;
  patientId: string;
  examType: string;
};

interface StudyHeaderProps {
  imageData: HeaderImageData;
  returnHref?: string;
  saveMessage: string;
  measurementsLength: number;
  isSaving: boolean;
  canExportJson: boolean;
  canUseKeypointTools: boolean;
  isAIDetecting: boolean;
  isAIMeasuring: boolean;
  hasVertebraeLayer: boolean;
  showVertebraeLayer: boolean;
  onToggleVertebraeLayer: () => void;
  onSave: () => void;
  onExportJson: () => void;
  onImportJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAIMeasure: () => void;
  onGenerateReport: () => void;
}

export default function StudyHeader({
  imageData,
  returnHref = '/imaging',
  saveMessage,
  measurementsLength,
  isSaving,
  canExportJson,
  canUseKeypointTools,
  isAIDetecting,
  isAIMeasuring,
  hasVertebraeLayer,
  showVertebraeLayer,
  onToggleVertebraeLayer,
  onSave,
  onExportJson,
  onImportJson,
  onAIMeasure,
  onGenerateReport,
}: StudyHeaderProps) {
  return (
    <div className="bg-black/60 backdrop-blur-sm border-b border-gray-700 px-3 py-2 flex-shrink-0 sm:px-6 sm:py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
          <Link
            href={returnHref}
            className="text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors flex items-center justify-center"
            title="返回影像列表"
          >
            <i className="ri-arrow-left-line w-5 h-5 flex items-center justify-center"></i>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-white font-semibold">
              {imageData.patientName} - {imageData.examType}
            </h1>
            <p className="truncate text-white/60 text-sm">
              影像ID: {imageData.id} | 患者ID: {imageData.patientId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {/* 保存状态提示 */}
          {saveMessage && (
            <div className="bg-green-500/80 text-white px-3 py-1 rounded text-sm flex items-center space-x-2">
              <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
              <span>{saveMessage}</span>
            </div>
          )}

          {/* 标注操作按钮组 */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-600 pb-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="text-white/80 hover:text-white px-2 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 sm:px-3"
              title="保存标注到数据库"
            >
              <span>{isSaving ? '保存中...' : '保存'}</span>
            </button>

            {/* 导出JSON按钮保留管理员限制 */}
            {canExportJson && (
              <button
                onClick={onExportJson}
                disabled={measurementsLength === 0}
                className="text-white/80 hover:text-white px-2 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 sm:px-3"
                title="导出标注文件（仅管理员）"
              >
                <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                <span>导出JSON</span>
              </button>
            )}

            <label
              className="text-white/80 hover:text-white px-2 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap cursor-pointer flex items-center space-x-2 sm:px-3"
              title="导入标注文件"
            >
              <i className="ri-upload-line w-4 h-4 flex items-center justify-center"></i>
              <span>导入JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportJson}
                className="hidden"
              />
            </label>
          </div>

          {/* 检测层显隐切换 */}
          {canUseKeypointTools && hasVertebraeLayer && (
            <button
              onClick={onToggleVertebraeLayer}
              className={`px-2 py-2 rounded-lg text-sm whitespace-nowrap flex items-center space-x-2 transition-colors sm:px-3 ${
                showVertebraeLayer
                  ? 'bg-blue-600/70 text-white hover:bg-blue-600'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={`${showVertebraeLayer ? '隐藏椎体检测层' : '显示椎体检测层'}，切换快捷键:Shift+D`}
            >
              <i className={`${showVertebraeLayer ? 'ri-eye-line' : 'ri-eye-off-line'} w-4 h-4 flex items-center justify-center`}></i>
              <span>检测层</span>
            </button>
          )}

          {/* AI测量按钮：测量完成后继续展示后台 AI 检测状态 */}
          <button
            onClick={onAIMeasure}
            disabled={isAIMeasuring || isAIDetecting}
            className="text-white/80 hover:text-white px-2 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 sm:px-3"
            title="使用AI自动测量"
          >
            {isAIMeasuring || isAIDetecting ? (
              <>
                <i className="ri-loader-line w-4 h-4 flex items-center justify-center animate-spin"></i>
                <span>{isAIMeasuring ? '测量中...' : 'AI检测中'}</span>
              </>
            ) : (
              <>
                <i className="ri-ruler-line w-4 h-4 flex items-center justify-center"></i>
                <span>AI测量</span>
              </>
            )}
          </button>

          <button
            onClick={onGenerateReport}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap sm:px-4"
          >
            生成报告
          </button>
        </div>
      </div>
    </div>
  );
}
