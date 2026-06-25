import Link from 'next/link';
import Tooltip from '@/components/ui/Tooltip';
import EntitySearchSelect, {
  type EntitySearchSelectLoadParams,
} from '@/components/common/EntitySearchSelect';
import TeamMultiSelect, {
  type TeamMultiSelectLoadParams,
  type TeamMultiSelectPage,
} from '@/components/common/TeamMultiSelect';
import type { ImageUploader } from '@/services/imageServices/imageFileService';
import BatchExportControls from '@/app/imaging/features/batch-export/components/BatchExportControls';
import type { ExportContentType } from '@/app/imaging/features/batch-export/domain';
import type { ExportContentOption } from '@/app/imaging/features/batch-export/hooks/use-export-content-options';
import {
  EXAM_TYPES,
  type ImagingViewMode,
  type ReviewStatusFilter,
} from '@/app/imaging/domain/imagingFilters';

interface ImagingSearchFiltersProps {
  searchTerm: string;
  showFilters: boolean;
  selectedExamType: string;
  selectedReviewStatus: ReviewStatusFilter;
  dateFrom: string;
  dateTo: string;
  viewMode: ImagingViewMode;
  canUseUploaderView: boolean;
  canUseTeamView: boolean;
  selectedUploader: ImageUploader | null;
  selectedTeamIds: number[];
  visibleCount: number;
  total: number;
  isBatchExportMode: boolean;
  selectedExportCount: number;
  exportContent: ExportContentType;
  exportContentOptions: ExportContentOption[];
  isExporting: boolean;
  exportProgress: number;
  exportMessage: string;
  onChangeSearchTerm: (value: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
  onChangeExamType: (value: string) => void;
  onChangeReviewStatus: (value: ReviewStatusFilter) => void;
  onChangeDateFrom: (value: string) => void;
  onChangeDateTo: (value: string) => void;
  onChangeViewMode: (value: ImagingViewMode) => void;
  onChangeUploader: (value: string, uploader: ImageUploader | null) => void;
  onChangeTeams: (teamIds: number[]) => void;
  onLoadUploaders: (params: EntitySearchSelectLoadParams) => Promise<{
    items: ImageUploader[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  onLoadTeams: (params: TeamMultiSelectLoadParams) => Promise<TeamMultiSelectPage>;
  onClearFilters: () => void;
  onToggleBatchExportMode: () => void;
  onExitBatchExportMode: () => void;
  onChangeExportContent: (value: ExportContentType) => void;
  onClearExportSelection: () => void;
  onStartBatchExport: () => void;
}

export default function ImagingSearchFilters({
  searchTerm,
  showFilters,
  selectedExamType,
  selectedReviewStatus,
  dateFrom,
  dateTo,
  viewMode,
  canUseUploaderView,
  canUseTeamView,
  selectedUploader,
  selectedTeamIds,
  visibleCount,
  total,
  isBatchExportMode,
  selectedExportCount,
  exportContent,
  exportContentOptions,
  isExporting,
  exportProgress,
  exportMessage,
  onChangeSearchTerm,
  onSearch,
  onToggleFilters,
  onChangeExamType,
  onChangeReviewStatus,
  onChangeDateFrom,
  onChangeDateTo,
  onChangeViewMode,
  onChangeUploader,
  onChangeTeams,
  onLoadUploaders,
  onLoadTeams,
  onClearFilters,
  onToggleBatchExportMode,
  onExitBatchExportMode,
  onChangeExportContent,
  onClearExportSelection,
  onStartBatchExport,
}: ImagingSearchFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">影像中心</h1>
          <p className="text-gray-600 mt-1">管理和查看患者医学影像</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Tooltip content="上传新的医学影像文件" position="bottom">
            <Link
              href="/upload?returnTo=/imaging"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap inline-flex items-center"
            >
              <i className="ri-upload-line mr-1"></i>
              上传影像
            </Link>
          </Tooltip>
          <Tooltip content="批量导出选中的影像文件" position="bottom">
            <button
              type="button"
              onClick={onToggleBatchExportMode}
              className={`px-4 py-2 rounded-lg whitespace-nowrap inline-flex items-center ${
                isBatchExportMode
                  ? 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className="ri-download-line mr-1"></i>
              批量导出
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <i className="ri-search-line w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="搜索患者姓名、检查类型或文件名"
              value={searchTerm}
              onChange={event => onChangeSearchTerm(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && onSearch()}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={onSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            搜索
          </button>

          {canUseUploaderView && (
            <div className="w-full sm:w-56">
              <EntitySearchSelect
                value={selectedUploader ? String(selectedUploader.id) : ''}
                selectedItem={selectedUploader}
                placeholder="上传者视角"
                searchPlaceholder="搜索医生姓名或邮箱"
                emptyText="暂无可选上传者"
                loadOptions={onLoadUploaders}
                getOptionValue={uploader => String(uploader.id)}
                mapOption={uploader => ({
                  primary:
                    uploader.real_name ||
                    uploader.username ||
                    `用户 ${uploader.id}`,
                  secondary: uploader.email || uploader.department || undefined,
                  meta: [
                    uploader.is_system_admin ? '系统管理员' : '',
                    uploader.title || uploader.position || '',
                  ].filter(Boolean),
                })}
                onChange={onChangeUploader}
              />
            </div>
          )}

          {canUseTeamView && (
            <div className="w-full sm:w-72">
              <TeamMultiSelect
                selectedIds={selectedTeamIds}
                placeholder="上传团队视角"
                searchPlaceholder="搜索团队名"
                emptyText="暂无可选团队"
                loadOptions={onLoadTeams}
                onChange={onChangeTeams}
              />
            </div>
          )}

          <button
            onClick={onToggleFilters}
            className={`px-4 py-2 border rounded-lg ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            更多选项
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-500">
            显示 {visibleCount} 条记录
            {total > 0 && ` (共 ${total} 条)`}
          </span>

          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => onChangeViewMode('grid')}
              className={`px-3 py-1.5 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="ri-grid-line w-4 h-4 flex items-center justify-center"></i>
            </button>
            <button
              onClick={() => onChangeViewMode('list')}
              className={`px-3 py-1.5 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="ri-list-check w-4 h-4 flex items-center justify-center"></i>
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              检查类型
            </label>
            <select
              value={selectedExamType}
              onChange={event => onChangeExamType(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              {EXAM_TYPES.map(examType => (
                <option key={examType} value={examType}>
                  {examType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              审核状态
            </label>
            <select
              value={selectedReviewStatus}
              onChange={event =>
                onChangeReviewStatus(event.target.value as ReviewStatusFilter)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="reviewed">已审核</option>
              <option value="unreviewed">未审核</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始日期
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={event => onChangeDateFrom(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束日期
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={event => onChangeDateTo(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end md:col-span-2 xl:col-span-4">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              清空筛选
            </button>
          </div>
        </div>
      )}

      {isBatchExportMode && (
        <BatchExportControls
          exportContent={exportContent}
          exportContentOptions={exportContentOptions}
          selectedCount={selectedExportCount}
          isExporting={isExporting}
          exportProgress={exportProgress}
          exportMessage={exportMessage}
          onChangeExportContent={onChangeExportContent}
          onClearSelection={onClearExportSelection}
          onExit={onExitBatchExportMode}
          onStartExport={onStartBatchExport}
        />
      )}
    </div>
  );
}
