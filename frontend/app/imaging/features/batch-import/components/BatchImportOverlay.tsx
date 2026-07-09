'use client';

import PatientSearchSelect from '@/app/upload/_components/patient-search-select';
import TeamMultiSelect, {
  type TeamMultiSelectLoadParams,
  type TeamMultiSelectPage,
} from '@/components/common/TeamMultiSelect';
import { AppModal } from '@/components/overlay/overlay-components';
import type {
  BatchImportFileItem,
  BatchImportOwnershipScope,
} from '@/app/imaging/features/batch-import/domain/types';

interface BatchImportOverlayProps {
  files: BatchImportFileItem[];
  patientId: string;
  examType: string;
  examTypes: readonly string[];
  ownershipScope: BatchImportOwnershipScope;
  teamIds: number[];
  lrFlip: boolean;
  isUploading: boolean;
  message: string;
  loadTeams: (params: TeamMultiSelectLoadParams) => Promise<TeamMultiSelectPage>;
  onPatientChange: (patientId: string) => void;
  onExamTypeChange: (examType: string) => void;
  onOwnershipScopeChange: (scope: BatchImportOwnershipScope) => void;
  onTeamIdsChange: (teamIds: number[]) => void;
  onToggleFlip: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function statusText(file: BatchImportFileItem) {
  if (file.error) return file.error;
  if (file.aiStatus === 'succeeded') return 'AI完成';
  if (file.aiStatus === 'running') return 'AI处理中';
  if (file.aiStatus === 'failed') return 'AI失败';
  if (file.uploadStatus === 'uploaded') return '已上传';
  if (file.uploadStatus === 'uploading') return '上传中';
  if (file.uploadStatus === 'preparing') return '处理中';
  if (file.uploadStatus === 'error') return '上传失败';
  return '待导入';
}

export default function BatchImportOverlay({
  files,
  patientId,
  examType,
  examTypes,
  ownershipScope,
  teamIds,
  lrFlip,
  isUploading,
  message,
  loadTeams,
  onPatientChange,
  onExamTypeChange,
  onOwnershipScopeChange,
  onTeamIdsChange,
  onToggleFlip,
  onConfirm,
  onClose,
}: BatchImportOverlayProps) {
  const hasDicomOrUnsupported = files.some(file => !file.type.startsWith('image/'));

  return (
    <AppModal open title="批量导入影像窗口">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-4 py-4 sm:px-8 sm:py-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">批量导入影像</h2>
            <p className="mt-1 text-sm text-gray-500">为本批影像统一设置患者、类型和归属</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="关闭"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="mx-4 border-t border-gray-200 sm:mx-8"></div>

        <div className="grid grid-cols-1 gap-6 px-4 py-4 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="rounded-lg border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="text-sm font-medium text-gray-800">待导入文件</div>
              <div className="text-sm text-gray-500">{files.length} 个文件</div>
            </div>
            <div className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
              {files.map(file => (
                <div key={file.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900" title={file.name}>
                      {file.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <span className="self-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                    {statusText(file)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              患者 <span className="text-red-500">*</span>
            </label>
            <div className="mb-6">
              <PatientSearchSelect
                value={patientId}
                onChange={onPatientChange}
                dropdownContentClassName="z-[10001]"
              />
            </div>

            <label htmlFor="batch-import-exam-type" className="mb-2 block text-sm font-medium text-gray-700">
              影像类型 <span className="text-red-500">*</span>
            </label>
            <select
              id="batch-import-exam-type"
              aria-label="影像类型"
              value={examType}
              onChange={event => onExamTypeChange(event.target.value)}
              disabled={isUploading}
              className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              {examTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <fieldset className="mb-6">
              <legend className="mb-3 block text-sm font-medium text-gray-700">
                影像归属 <span className="text-red-500">*</span>
              </legend>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="batch-import-ownership"
                    checked={ownershipScope === 'personal'}
                    disabled={isUploading}
                    onChange={() => onOwnershipScopeChange('personal')}
                    className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block font-medium">仅自己可见</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">
                      不加入任何团队，只有本人可见
                    </span>
                  </span>
                </label>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="batch-import-ownership"
                      checked={ownershipScope === 'team'}
                      disabled={isUploading}
                      onChange={() => onOwnershipScopeChange('team')}
                      className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="block font-medium">共享给团队</span>
                  </label>
                  {ownershipScope === 'team' && (
                    <div className="ml-7 mt-3">
                      <TeamMultiSelect
                        selectedIds={teamIds}
                        loadOptions={loadTeams}
                        onChange={onTeamIdsChange}
                        placeholder="选择归属团队"
                        emptyText="没有可选择的团队"
                        dropdownContentClassName="z-[10001]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </fieldset>

            <div className="mb-6 border-t border-gray-200"></div>
            <button
              type="button"
              onClick={onToggleFlip}
              disabled={isUploading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                lrFlip
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <i className="ri-arrow-left-right-line text-lg"></i>
              左右翻转{lrFlip ? '（已开启）' : ''}
            </button>
            {hasDicomOrUnsupported && lrFlip && (
              <p className="mt-2 text-xs leading-5 text-amber-700">
                非普通图片文件不会在浏览器中翻转，将按原文件导入。
              </p>
            )}

            {message && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="mx-4 border-t border-gray-200 sm:mx-8"></div>

        <div className="flex justify-end gap-4 px-4 py-4 sm:px-8 sm:py-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg border border-gray-300 px-7 py-3 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUploading}
            className="rounded-lg bg-blue-600 px-7 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
