'use client';

import { AnnotationBindings } from '../domain/annotation-binding';
import { MeasurementData } from '../types';

interface BindingPanelProps {
  pointBindings: AnnotationBindings;
  selectedBindingGroupId: string | null;
  measurements: MeasurementData[];
  isBindingPanelOpen: boolean;
  isManualBindingMode: boolean;
  manualBindingSelectedPointsCount: number;
  onToggleOpen: () => void;
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
}

export default function BindingPanel({
  pointBindings,
  selectedBindingGroupId,
  measurements,
  isBindingPanelOpen,
  isManualBindingMode,
  manualBindingSelectedPointsCount,
  onToggleOpen,
  onClearBindings,
  onStartManualBinding,
  onCompleteManualBinding,
  onCancelManualBinding,
  onSelectBindingGroup,
  onRemoveBindingGroup,
  onRemoveBindingMember,
}: BindingPanelProps) {
  return (
    <div className="mt-3 border border-gray-600 rounded-lg overflow-hidden">
      {/* 标题行（始终可见） */}
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-gray-700/50 transition-colors"
      >
        <span className="flex items-center gap-1">
          <i className="ri-links-line text-sm"></i>
          共享点位绑定面板
          {pointBindings.syncGroups.length > 0 && (
            <span className="ml-1 bg-amber-700/60 text-amber-300 rounded-full px-1.5 py-0 text-xs">
              {pointBindings.syncGroups.length}
            </span>
          )}
        </span>
        <i
          className={`ri-arrow-${isBindingPanelOpen ? 'up' : 'down'}-s-line text-sm text-gray-400`}
        ></i>
      </button>

      {/* 操作按钮行（始终可见） */}
      <div className="px-3 py-2 flex gap-2 border-t border-gray-700/60">
        <button
          onClick={onClearBindings}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
          title="临时清除所有绑定（增减标注时将自动重建）"
        >
          <i className="ri-scissors-line text-xs"></i>
          解除全部绑定
        </button>
        {isManualBindingMode ? (
          <>
            <button
              onClick={onCompleteManualBinding}
              disabled={manualBindingSelectedPointsCount < 2}
              className="flex-1 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
              title={
                manualBindingSelectedPointsCount < 2
                  ? '请至少选择 2 个点'
                  : '完成绑定'
              }
            >
              <i className="ri-check-line text-xs"></i>
              完成绑定
              {manualBindingSelectedPointsCount >= 1
                ? ` (${manualBindingSelectedPointsCount})`
                : ''}
            </button>
            <button
              onClick={onCancelManualBinding}
              className="bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs py-1.5 px-2 rounded transition-colors"
              title="取消手动绑定"
            >
              <i className="ri-close-line text-xs"></i>
            </button>
          </>
        ) : (
          <button
            onClick={onStartManualBinding}
            className="flex-1 bg-gray-700 hover:bg-cyan-700 text-gray-300 hover:text-white text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
            title="进入手动绑定模式，点击图像中的标注点以选中"
          >
            <i className="ri-cursor-line text-xs"></i>
            手动绑定
          </button>
        )}
      </div>

      {/* 手动绑定提示（手动绑定模式下始终可见） */}
      {isManualBindingMode && (
        <div className="px-3 py-1.5 bg-cyan-900/30 border-t border-cyan-700/40 text-xs text-cyan-300 flex items-center gap-1">
          <i className="ri-cursor-line text-xs"></i>
          点击左侧图像中的标注点以选中 / 取消选中
        </div>
      )}

      {/* 绑定组列表（折叠控制） */}
      {isBindingPanelOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700/60">
          {pointBindings.syncGroups.length > 0 ? (
            <div className="space-y-2 mt-1">
              {pointBindings.syncGroups.map(group => {
                const isGroupSelected = selectedBindingGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`rounded border p-2 cursor-pointer transition-colors ${
                      isGroupSelected
                        ? 'border-amber-400 bg-amber-900/30'
                        : 'border-gray-600 bg-gray-700/40 hover:border-gray-500'
                    }`}
                    onClick={() =>
                      onSelectBindingGroup(isGroupSelected ? null : group.id)
                    }
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-xs font-medium text-gray-200 truncate">
                          {group.name}
                        </span>
                      </div>
                      <button
                        onClick={event => {
                          event.stopPropagation();
                          onRemoveBindingGroup(group.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-0.5 flex-shrink-0 ml-2"
                        title="解除该同步组的全部绑定"
                      >
                        <i className="ri-scissors-line text-xs"></i>
                        解绑
                      </button>
                    </div>
                    <div className="space-y-1">
                      {group.members.map(member => {
                        const annotation = measurements.find(
                          measurement => measurement.id === member.annotationId
                        );

                        return (
                          <div
                            key={`${member.annotationId}-${member.pointIndex}`}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs text-gray-400 truncate">
                              <span className="text-gray-300">
                                {annotation?.type ?? '未知标注'}
                              </span>
                              {' · '}第 {member.pointIndex + 1} 点
                            </span>
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                onRemoveBindingMember(
                                  group.id,
                                  member.annotationId,
                                  member.pointIndex
                                );
                              }}
                              className="text-gray-600 hover:text-red-400 flex-shrink-0 ml-1 transition-colors"
                              title="将此点从同步组中移除"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic mt-1">
              当前无共享点位绑定
            </p>
          )}
        </div>
      )}
    </div>
  );
}

