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
  saveMessage: string;
  measurementsLength: number;
  isSaving: boolean;
  isAdmin: boolean;
  isAIDetecting: boolean;
  isAIMeasuring: boolean;
  onSave: () => void;
  onExportJson: () => void;
  onImportJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAIDetect: () => void;
  onAIMeasure: () => void;
  onGenerateReport: () => void;
}

export default function StudyHeader({
  imageData,
  saveMessage,
  measurementsLength,
  isSaving,
  isAdmin,
  isAIDetecting,
  isAIMeasuring,
  onSave,
  onExportJson,
  onImportJson,
  onAIDetect,
  onAIMeasure,
  onGenerateReport,
}: StudyHeaderProps) {
  return (
    <div className="bg-black/60 backdrop-blur-sm border-b border-gray-700 px-6 py-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/imaging"
            className="text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors flex items-center justify-center"
            title="返回影像列表"
          >
            <i className="ri-arrow-left-line w-5 h-5 flex items-center justify-center"></i>
          </Link>
          <div>
            <h1 className="text-white font-semibold">
              {imageData.patientName} - {imageData.examType}
            </h1>
            <p className="text-white/60 text-sm">
              影像ID: {imageData.id} | 患者ID: {imageData.patientId}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 保存状态提示 */}
          {saveMessage && (
            <div className="bg-green-500/80 text-white px-3 py-1 rounded text-sm flex items-center space-x-2">
              <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
              <span>{saveMessage}</span>
            </div>
          )}

          {/* 标注操作按钮组 */}
          <div className="flex items-center space-x-2 border-r border-gray-600 pr-3">
            <button
              onClick={onSave}
              disabled={measurementsLength === 0 || isSaving}
              className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="保存标注到数据库"
            >
              <span>{isSaving ? '保存中...' : '保存'}</span>
            </button>

            {/* 导出JSON按钮 - 仅管理员可见 */}
            {isAdmin && (
              <button
                onClick={onExportJson}
                disabled={measurementsLength === 0}
                className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                title="导出标注文件（仅管理员）"
              >
                <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                <span>导出JSON</span>
              </button>
            )}

            <label
              className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap cursor-pointer flex items-center space-x-2"
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

          {/* AI检测按钮 - 仅管理员可见 */}
          {isAdmin && (
            <button
              onClick={onAIDetect}
              disabled={isAIDetecting}
              className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="使用AI检测椎骨位置（仅管理员）"
            >
              {isAIDetecting ? (
                <>
                  <i className="ri-loader-line w-4 h-4 flex items-center justify-center animate-spin"></i>
                  <span>检测中...</span>
                </>
              ) : (
                <>
                  <i className="ri-scan-line w-4 h-4 flex items-center justify-center"></i>
                  <span>AI检测</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onAIMeasure}
            disabled={isAIMeasuring}
            className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="使用AI自动测量Cobb角"
          >
            {isAIMeasuring ? (
              <>
                <i className="ri-loader-line w-4 h-4 flex items-center justify-center animate-spin"></i>
                <span>测量中...</span>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
          >
            生成报告
          </button>
        </div>
      </div>
    </div>
  );
}

