'use client';

import { useCallback, useRef, type ChangeEvent } from 'react';
import { useVirtual } from 'react-virtual';
import PatientSearchSelect from '@/app/upload/_components/patient-search-select';
import TeamMultiSelect, {
  type TeamMultiSelectLoadParams,
  type TeamMultiSelectPage,
} from '@/components/common/TeamMultiSelect';
import { AppModal } from '@/components/overlay/overlay-components';
import type {
  BatchImportFileItem,
  BatchImportOwnershipScope,
  BatchImportTab,
} from '../domain/types';
import type {
  ImageImportBatch,
  ImageImportItem,
} from '@/services/imageServices';

interface BatchImportOverlayProps {
  activeTab: BatchImportTab;
  files: BatchImportFileItem[];
  patientId: string;
  examType: string;
  examTypes: readonly string[];
  ownershipScope: BatchImportOwnershipScope;
  teamIds: number[];
  lrFlip: boolean;
  isUploading: boolean;
  message: string;
  maxFiles: number;
  batches: ImageImportBatch[];
  batchPage: number;
  batchTotalPages: number;
  selectedBatchId: string | null;
  taskItems: ImageImportItem[];
  itemPage: number;
  itemTotalPages: number;
  tasksLoading: boolean;
  loadTeams: (params: TeamMultiSelectLoadParams) => Promise<TeamMultiSelectPage>;
  onTabChange: (tab: BatchImportTab) => void;
  onFileInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onPatientChange: (patientId: string) => void;
  onExamTypeChange: (examType: string) => void;
  onOwnershipScopeChange: (scope: BatchImportOwnershipScope) => void;
  onTeamIdsChange: (teamIds: number[]) => void;
  onToggleFlip: () => void;
  onSelectBatch: (batchId: string) => void;
  onChangeBatchPage: (page: number) => void;
  onChangeItemPage: (page: number) => void;
  onRetryTaskItem: (itemId: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function localStatusText(file: BatchImportFileItem) {
  if (file.error) return file.error;
  if (file.aiStatus === 'succeeded') return 'AI完成';
  if (file.aiStatus === 'running') return 'AI处理中';
  if (file.aiStatus === 'queued') return 'AI已排队';
  if (file.aiStatus === 'failed') return 'AI失败';
  if (file.uploadStatus === 'uploaded') return '已上传';
  if (file.uploadStatus === 'uploading') return '上传中';
  if (file.uploadStatus === 'preparing') return '处理中';
  if (file.uploadStatus === 'error') return '上传失败';
  return '待导入';
}

function batchStatusText(status: ImageImportBatch['status']) {
  const labels: Record<ImageImportBatch['status'], string> = {
    UPLOADING: '上传中',
    PROCESSING: '处理中',
    COMPLETED: '已完成',
    PARTIAL_FAILED: '部分失败',
    FAILED: '失败',
  };
  return labels[status];
}

function taskStatusText(item: ImageImportItem) {
  if (item.error) return item.error;
  if (item.upload_status === 'FAILED') return '上传失败';
  const labels: Record<ImageImportItem['ai_status'], string> = {
    PENDING: '待排队',
    QUEUED: '已排队',
    RUNNING: 'AI处理中',
    SUCCEEDED: 'AI完成',
    FAILED: 'AI失败',
  };
  return labels[item.ai_status];
}

function FileVirtualList({ files }: { files: BatchImportFileItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const estimateSize = useCallback(() => 64, []);
  const virtualizer = useVirtual({
    size: files.length,
    parentRef,
    estimateSize,
    overscan: 8,
  });

  if (files.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        尚未选择影像
      </div>
    );
  }

  return (
    <div ref={parentRef} className="max-h-[52vh] overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.totalSize}px` }}
      >
        {virtualizer.virtualItems.map(row => {
          const file = files[row.index];
          return (
            <div
              key={file.id}
              className="absolute left-0 top-0 grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-100 px-4 py-3"
              style={{
                height: `${row.size}px`,
                transform: `translateY(${row.start}px)`,
              }}
            >
              <div className="min-w-0">
                <div
                  className="truncate text-sm font-medium text-gray-900"
                  title={file.name}
                >
                  {file.name}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </div>
              </div>
              <span
                className="max-w-40 truncate self-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
                title={localStatusText(file)}
              >
                {localStatusText(file)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImportTasks({
  batches,
  batchPage,
  batchTotalPages,
  selectedBatchId,
  taskItems,
  itemPage,
  itemTotalPages,
  tasksLoading,
  onSelectBatch,
  onChangeBatchPage,
  onChangeItemPage,
  onRetryTaskItem,
}: Pick<
  BatchImportOverlayProps,
  | 'batches'
  | 'batchPage'
  | 'batchTotalPages'
  | 'selectedBatchId'
  | 'taskItems'
  | 'itemPage'
  | 'itemTotalPages'
  | 'tasksLoading'
  | 'onSelectBatch'
  | 'onChangeBatchPage'
  | 'onChangeItemPage'
  | 'onRetryTaskItem'
>) {
  return (
    <div className="grid min-h-[520px] grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-6">
      <section className="overflow-hidden rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">
          导入任务
        </div>
        <div className="max-h-[440px] divide-y divide-gray-100 overflow-y-auto">
          {batches.map(batch => (
            <button
              key={batch.batch_id}
              type="button"
              onClick={() => onSelectBatch(batch.batch_id)}
              className={`block w-full px-4 py-3 text-left ${
                selectedBatchId === batch.batch_id
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-gray-900">
                  {batch.description || '未指定类型'}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {batchStatusText(batch.status)}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {batch.succeeded_items}/{batch.total_items} 完成
                {batch.failed_items > 0 ? `，${batch.failed_items} 失败` : ''}
              </div>
            </button>
          ))}
          {!tasksLoading && batches.length === 0 && (
            <div className="px-4 py-16 text-center text-sm text-gray-500">
              暂无导入任务
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-gray-200 px-3 py-3 text-sm">
          <button
            type="button"
            disabled={batchPage <= 1}
            onClick={() => onChangeBatchPage(batchPage - 1)}
            className="text-blue-600 disabled:text-gray-300"
          >
            上一页
          </button>
          <span>
            第 {batchPage} / {batchTotalPages} 页
          </span>
          <button
            type="button"
            disabled={batchPage >= batchTotalPages}
            onClick={() => onChangeBatchPage(batchPage + 1)}
            className="text-blue-600 disabled:text-gray-300"
          >
            下一页
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">
          文件进度
        </div>
        <div className="max-h-[450px] divide-y divide-gray-100 overflow-y-auto">
          {taskItems.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-gray-900">
                  {item.filename}
                </div>
                <div
                  className="mt-1 truncate text-xs text-gray-500"
                  title={taskStatusText(item)}
                >
                  {taskStatusText(item)}
                </div>
              </div>
              {(item.ai_status === 'FAILED' ||
                (item.ai_status === 'PENDING' &&
                  item.upload_status === 'UPLOADED')) && (
                <button
                  type="button"
                  onClick={() => onRetryTaskItem(item.id)}
                  className="rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
                >
                  重新入队
                </button>
              )}
            </div>
          ))}
          {!tasksLoading && selectedBatchId && taskItems.length === 0 && (
            <div className="px-4 py-16 text-center text-sm text-gray-500">
              暂无文件记录
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-gray-200 px-3 py-3 text-sm">
          <button
            type="button"
            disabled={itemPage <= 1}
            onClick={() => onChangeItemPage(itemPage - 1)}
            className="text-blue-600 disabled:text-gray-300"
          >
            上一页
          </button>
          <span>
            第 {itemPage} / {itemTotalPages} 页
          </span>
          <button
            type="button"
            disabled={itemPage >= itemTotalPages}
            onClick={() => onChangeItemPage(itemPage + 1)}
            className="text-blue-600 disabled:text-gray-300"
          >
            下一页
          </button>
        </div>
      </section>
    </div>
  );
}

export default function BatchImportOverlay(props: BatchImportOverlayProps) {
  const hasDicomOrUnsupported = props.files.some(
    file => !file.type.startsWith('image/')
  );

  return (
    <AppModal open title="批量导入影像窗口">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <header className="flex items-start justify-between px-4 py-4 sm:px-8 sm:py-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">批量导入影像</h2>
            <p className="mt-1 text-sm text-gray-500">
              上传完成后由后台按队列顺序执行 AI 测量
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.isUploading}
            className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="关闭"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </header>

        <div className="flex border-y border-gray-200 px-4 sm:px-8">
          {[
            ['new-import', '新建导入'],
            ['import-tasks', '导入任务'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => props.onTabChange(value as BatchImportTab)}
              className={`border-b-2 px-5 py-3 text-sm ${
                props.activeTab === value
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {props.activeTab === 'new-import' ? (
          <>
            <div className="grid grid-cols-1 gap-6 px-4 py-4 sm:px-8 sm:py-6 lg:grid-cols-[minmax(0,1fr)_350px]">
              <section className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      待导入文件
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      最多 {props.maxFiles} 个文件
                    </div>
                  </div>
                  <label className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                    选择影像
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".dcm,.dicom,.jpg,.jpeg,.png,.tiff,.tif"
                      disabled={props.isUploading}
                      onChange={props.onFileInput}
                    />
                  </label>
                </div>
                <FileVirtualList files={props.files} />
              </section>

              <section className="rounded-lg border border-gray-200 p-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  患者 <span className="text-red-500">*</span>
                </label>
                <div className="mb-6">
                  <PatientSearchSelect
                    value={props.patientId}
                    onChange={props.onPatientChange}
                    dropdownContentClassName="z-[10001]"
                  />
                </div>

                <label
                  htmlFor="batch-import-exam-type"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  影像类型 <span className="text-red-500">*</span>
                </label>
                <select
                  id="batch-import-exam-type"
                  aria-label="影像类型"
                  value={props.examType}
                  onChange={event => props.onExamTypeChange(event.target.value)}
                  disabled={props.isUploading}
                  className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
                >
                  {props.examTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <fieldset className="mb-6">
                  <legend className="mb-3 text-sm font-medium text-gray-700">
                    影像归属 <span className="text-red-500">*</span>
                  </legend>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="radio"
                        name="batch-import-ownership"
                        checked={props.ownershipScope === 'personal'}
                        disabled={props.isUploading}
                        onChange={() =>
                          props.onOwnershipScopeChange('personal')
                        }
                        className="mt-1"
                      />
                      <span>仅自己可见</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="radio"
                        name="batch-import-ownership"
                        checked={props.ownershipScope === 'team'}
                        disabled={props.isUploading}
                        onChange={() => props.onOwnershipScopeChange('team')}
                        className="mt-1"
                      />
                      <span>共享给团队</span>
                    </label>
                    {props.ownershipScope === 'team' && (
                      <TeamMultiSelect
                        selectedIds={props.teamIds}
                        loadOptions={props.loadTeams}
                        onChange={props.onTeamIdsChange}
                        placeholder="选择归属团队"
                        emptyText="没有可选择的团队"
                        dropdownContentClassName="z-[10001]"
                      />
                    )}
                  </div>
                </fieldset>

                <button
                  type="button"
                  onClick={props.onToggleFlip}
                  disabled={props.isUploading}
                  className={`w-full rounded-lg border px-4 py-3 ${
                    props.lrFlip
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  左右翻转{props.lrFlip ? '（已开启）' : ''}
                </button>
                {hasDicomOrUnsupported && props.lrFlip && (
                  <p className="mt-2 text-xs text-amber-700">
                    非普通图片文件不会在浏览器中翻转。
                  </p>
                )}
                {props.message && (
                  <div className="mt-6 border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    {props.message}
                  </div>
                )}
              </section>
            </div>
            <footer className="flex justify-end gap-4 border-t border-gray-200 px-4 py-4 sm:px-8">
              <button
                type="button"
                onClick={props.onClose}
                disabled={props.isUploading}
                className="rounded-lg border border-gray-300 px-7 py-3 text-gray-700 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={props.onConfirm}
                disabled={props.isUploading}
                className="rounded-lg bg-blue-600 px-7 py-3 text-white disabled:opacity-60"
              >
                {props.isUploading ? '导入中...' : '开始导入'}
              </button>
            </footer>
          </>
        ) : (
          <ImportTasks
            batches={props.batches}
            batchPage={props.batchPage}
            batchTotalPages={props.batchTotalPages}
            selectedBatchId={props.selectedBatchId}
            taskItems={props.taskItems}
            itemPage={props.itemPage}
            itemTotalPages={props.itemTotalPages}
            tasksLoading={props.tasksLoading}
            onSelectBatch={props.onSelectBatch}
            onChangeBatchPage={props.onChangeBatchPage}
            onChangeItemPage={props.onChangeItemPage}
            onRetryTaskItem={props.onRetryTaskItem}
          />
        )}
      </div>
    </AppModal>
  );
}
