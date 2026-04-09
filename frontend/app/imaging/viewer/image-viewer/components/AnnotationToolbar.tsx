'use client';

import BindingPanel from './BindingPanel';
import ReportPanel from './ReportPanel';
import { AnnotationBindings } from '../domain/annotation-binding';
import { Measurement, Tool } from '../types';

interface AnnotationToolbarProps {
  examType: string;
  tools: Tool[];
  measurements: Measurement[];
  selectedTool: string;
  isSettingStandardDistance: boolean;
  standardDistance: number | null;
  standardDistancePointsLength: number;
  standardDistanceValue: string;
  reportText: string;
  saveMessage: string;
  pointBindings: AnnotationBindings;
  selectedBindingGroupId: string | null;
  isBindingPanelOpen: boolean;
  isManualBindingMode: boolean;
  manualBindingSelectedPointsCount: number;
  showTagPanel: boolean;
  tags: string[];
  newTag: string;
  showAdvicePanel: boolean;
  treatmentAdvice: string;
  onSelectTool: (toolId: string) => void;
  onActivateHandMode: () => void;
  onToggleImagePanLocked: () => void;
  isImagePanLocked: boolean;
  onToggleBindingPanel: () => void;
  onClearBindings: () => void;
  onStartManualBinding: () => void;
  onCompleteManualBinding: () => void;
  onCancelManualBinding: () => void;
  onSelectBindingGroup: (groupId: string | null) => void;
  onRemoveBindingGroup: (groupId: string) => void;
  onRemoveBindingMember: (
    groupId: string,
    annotationId: string,
    pointIndex: number
  ) => void;
  onStartStandardDistance: () => void;
  onChangeStandardDistanceValue: (value: string) => void;
  onStandardDistanceInputBlur: () => void;
  onStandardDistanceInputEnter: () => void;
  onToggleTagPanel: () => void;
  onChangeNewTag: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
  onToggleAdvicePanel: () => void;
  onChangeTreatmentAdvice: (value: string) => void;
  onCopyReport: () => void;
}

export default function AnnotationToolbar({
  examType,
  tools,
  measurements,
  selectedTool,
  isSettingStandardDistance,
  standardDistance,
  standardDistancePointsLength,
  standardDistanceValue,
  reportText,
  pointBindings,
  selectedBindingGroupId,
  isBindingPanelOpen,
  isManualBindingMode,
  manualBindingSelectedPointsCount,
  showTagPanel,
  tags,
  newTag,
  showAdvicePanel,
  treatmentAdvice,
  onSelectTool,
  onActivateHandMode,
  onToggleImagePanLocked,
  isImagePanLocked,
  onToggleBindingPanel,
  onClearBindings,
  onStartManualBinding,
  onCompleteManualBinding,
  onCancelManualBinding,
  onSelectBindingGroup,
  onRemoveBindingGroup,
  onRemoveBindingMember,
  onStartStandardDistance,
  onChangeStandardDistanceValue,
  onStandardDistanceInputBlur,
  onStandardDistanceInputEnter,
  onToggleTagPanel,
  onChangeNewTag,
  onAddTag,
  onRemoveTag,
  onToggleAdvicePanel,
  onChangeTreatmentAdvice,
  onCopyReport,
}: AnnotationToolbarProps) {
  const measurementTools = tools.filter(
    tool =>
      tool.pointsNeeded > 0 &&
      tool.id !== 'aux-angle' &&
      tool.id !== 'aux-horizontal-line' &&
      tool.id !== 'aux-vertical-line'
  );
  const auxiliaryTools = tools.filter(
    tool =>
      tool.pointsNeeded === 0 ||
      tool.id === 'aux-angle' ||
      tool.id === 'aux-horizontal-line' ||
      tool.id === 'aux-vertical-line'
  );

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex-1 overflow-y-auto">
        <h3 className="font-semibold text-white mb-3">测量工具 - {examType}</h3>

        <div className="mb-4">
          {/* 基础移动模式 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
              <i className="ri-hand-line w-3 h-3 mr-1"></i>
              基础模式
            </h4>
            <div className="flex gap-2">
              <button
                onClick={onActivateHandMode}
                className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                  selectedTool === 'hand'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="移动、选择、删除工具"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  className="flex flex-col text-center"
                  style={{
                    transform: 'translateY(0)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    display: 'flex',
                  }}
                >
                  <i
                    className="ri-hand-line text-lg mb-1"
                    style={{ lineHeight: '1' }}
                  ></i>
                  <span className="text-xs" style={{ lineHeight: '1' }}>
                    移动
                  </span>
                </div>
                {selectedTool === 'hand' && (
                  <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -right-1 bg-blue-500 rounded-full"></i>
                )}
              </button>
            </div>

            {/* 锁定图像平移按钮 */}
            <div className="mt-2">
              <button
                onClick={onToggleImagePanLocked}
                className={`rounded-lg w-full h-10 transition-all relative flex items-center justify-center gap-2 ${
                  isImagePanLocked
                    ? 'bg-yellow-600 text-white ring-2 ring-yellow-400 shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={
                  isImagePanLocked
                    ? '图像已锁定，点击解锁'
                    : '锁定图像平移，防止拖拽时移动图像'
                }
              >
                <i
                  className={
                    isImagePanLocked
                      ? 'ri-lock-line text-base'
                      : 'ri-lock-unlock-line text-base'
                  }
                ></i>
                <span className="text-xs">
                  {isImagePanLocked ? '已锁定' : '锁定图像'}
                </span>
                {isImagePanLocked && (
                  <i className="ri-check-line w-3 h-3 flex items-center justify-center text-yellow-200 absolute -top-1 -right-1 bg-yellow-500 rounded-full"></i>
                )}
              </button>
            </div>

            <BindingPanel
              pointBindings={pointBindings}
              selectedBindingGroupId={selectedBindingGroupId}
              measurements={measurements}
              isBindingPanelOpen={isBindingPanelOpen}
              isManualBindingMode={isManualBindingMode}
              manualBindingSelectedPointsCount={manualBindingSelectedPointsCount}
              onToggleOpen={onToggleBindingPanel}
              onClearBindings={onClearBindings}
              onStartManualBinding={onStartManualBinding}
              onCompleteManualBinding={onCompleteManualBinding}
              onCancelManualBinding={onCancelManualBinding}
              onSelectBindingGroup={onSelectBindingGroup}
              onRemoveBindingGroup={onRemoveBindingGroup}
              onRemoveBindingMember={onRemoveBindingMember}
            />
          </div>

          {/* 专业测量工具 */}
          {measurementTools.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                <i className="ri-ruler-line w-3 h-3 mr-1"></i>
                测量标注
              </h4>
              <div className="flex flex-wrap gap-2">
                {measurementTools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                      selectedTool === tool.id
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={tool.description}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      className="flex flex-col text-center"
                      style={{
                        transform: 'translateY(0)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        display: 'flex',
                      }}
                    >
                      <i
                        className={`${tool.icon} text-lg mb-1`}
                        style={{ lineHeight: '1' }}
                      ></i>
                      <span
                        className="text-xs text-center"
                        style={{ lineHeight: '1' }}
                      >
                        {tool.name}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {tool.pointsNeeded}
                    </div>
                    {selectedTool === tool.id && (
                      <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -left-1 bg-blue-500 rounded-full"></i>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 辅助图形工具 */}
          {auxiliaryTools.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                <i className="ri-shape-line w-3 h-3 mr-1"></i>
                辅助图形
              </h4>
              <div className="flex flex-wrap gap-2">
                {auxiliaryTools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                      selectedTool === tool.id
                        ? 'bg-green-600 text-white ring-2 ring-green-400 shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={`${tool.description} (拖拽绘制)`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      className="flex flex-col text-center"
                      style={{
                        transform: 'translateY(0)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        display: 'flex',
                      }}
                    >
                      <i
                        className={`${tool.icon} text-lg mb-1`}
                        style={{ lineHeight: '1' }}
                      ></i>
                      <span
                        className="text-xs text-center"
                        style={{ lineHeight: '1' }}
                      >
                        {tool.name
                          .replace('Auxiliary ', '')
                          .replace('Polygons', '多边形')}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      <i className="ri-mouse-line w-2 h-2"></i>
                    </div>
                    {selectedTool === tool.id && (
                      <i className="ri-check-line w-3 h-3 flex items-center justify-center text-green-200 absolute -top-1 -left-1 bg-green-500 rounded-full"></i>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 标准距离设置按钮 */}
          <div className="mb-4">
            <button
              onClick={onStartStandardDistance}
              className={`w-full px-3 py-2 ${
                isSettingStandardDistance
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors`}
            >
              <i className="ri-ruler-line w-4 h-4"></i>
              <span>
                {isSettingStandardDistance
                  ? '设置标准距离中...'
                  : '标准距离设置'}
              </span>
            </button>

            {/* 常驻输入框：设置标准距离 */}
            <div className="mt-2">
              <label className="text-xs text-gray-400 mb-1 block">
                标准距离值 (mm)
              </label>
              <input
                type="number"
                value={standardDistanceValue}
                onChange={event => onChangeStandardDistanceValue(event.target.value)}
                onBlur={onStandardDistanceInputBlur}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    onStandardDistanceInputEnter();
                  }
                }}
                placeholder="例如: 100"
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 text-white text-sm rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              {standardDistance !== null && standardDistancePointsLength === 2 && (
                <div className="mt-1.5 text-xs text-green-400">
                  ✓ 已设置: {standardDistance}mm
                </div>
              )}
            </div>
          </div>

          {/* 标签系统按钮 */}
          <div className="mb-4">
            <button
              onClick={onToggleTagPanel}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <i className="ri-price-tag-line w-4 h-4"></i>
              <span>标签管理</span>
            </button>

            {showTagPanel && (
              <div className="mt-2 bg-gray-700/50 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={event => onChangeNewTag(event.target.value)}
                      placeholder="输入标签"
                      className="flex-1 px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-green-400 focus:outline-none"
                      onKeyDown={event => {
                        if (event.key === 'Enter' && newTag.trim()) {
                          onAddTag();
                        }
                      }}
                    />
                    <button
                      onClick={onAddTag}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                    >
                      添加
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <div
                          key={`${tag}-${index}`}
                          className="bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1"
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => onRemoveTag(index)}
                            className="hover:text-red-300"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 治疗建议按钮 */}
          <div className="mb-4">
            <button
              onClick={onToggleAdvicePanel}
              className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <i className="ri-file-text-line w-4 h-4"></i>
              <span>治疗建议</span>
            </button>

            {showAdvicePanel && (
              <div className="mt-2 bg-gray-700/50 rounded-lg p-3">
                <textarea
                  value={treatmentAdvice}
                  onChange={event => onChangeTreatmentAdvice(event.target.value)}
                  placeholder="输入医生的治疗建议..."
                  className="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-orange-400 focus:outline-none resize-none"
                  rows={3}
                />
                {treatmentAdvice && (
                  <div className="text-xs text-orange-400 mt-2">
                    ✓ 已输入 {treatmentAdvice.length} 个字符
                  </div>
                )}
              </div>
            )}
          </div>

          <ReportPanel reportText={reportText} onCopy={onCopyReport} />
        </div>
      </div>
    </div>
  );
}

