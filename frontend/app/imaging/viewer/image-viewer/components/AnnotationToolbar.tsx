'use client';

import { useState } from 'react';
import BindingPanel from './BindingPanel';
import ReportPanel from './ReportPanel';
import { AnnotationBindings } from '../domain/annotation-binding';
import { isApAutomaticMeasurementTool } from '../catalog/ap/measurements';
import { isAuxiliaryTool } from '../catalog/auxiliary';
import { isLateralRestorableMeasurementTool } from '../catalog/lateral/measurements';
import {
  hasUniqueAnnotationForTool,
  isUniqueAnnotationTool,
} from '../domain/annotation-uniqueness';
import {
  getKeypointGroupsForExamType,
  hasKeypoint,
  isAnteriorExamType,
  KeypointAnnotation,
} from '../domain/keypoint-state';
import { MeasurementData, Tool } from '../types';
import IconMapper from './icons/IconMapper';

type ToolTab = 'measurement' | 'keypoint';
type ToolStatus = 'available' | 'exists' | 'missing-keypoints';

interface AnnotationToolbarProps {
  examType: string;
  tools: Tool[];
  measurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  completeVertebraGroups: string[];
  canUseKeypointTools: boolean;
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
  automaticToolStatus: Record<string, ToolStatus>;
  onSelectTool: (toolId: string) => void;
  onRestoreAutomaticMeasurement: (toolId: string) => void;
  onCreateAvt: (apexVertebra: string) => void;
  onCreateCobb: (upperVertebra: string, lowerVertebra: string) => void;
  onCreateVertebraCenter: (vertebra: string) => void;
  onCreateTts: (upperVertebra: string, lowerVertebra: string) => void;
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
  keypoints,
  completeVertebraGroups,
  canUseKeypointTools,
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
  automaticToolStatus,
  onSelectTool,
  onRestoreAutomaticMeasurement,
  onCreateAvt,
  onCreateCobb,
  onCreateVertebraCenter,
  onCreateTts,
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
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('measurement');
  const [openKeypointGroup, setOpenKeypointGroup] = useState<string | null>(
    null
  );
  const [openMeasurementTool, setOpenMeasurementTool] = useState<string | null>(
    null
  );
  const [cobbUpperVertebra, setCobbUpperVertebra] = useState('');
  const [cobbLowerVertebra, setCobbLowerVertebra] = useState('');
  const [ttsUpperVertebra, setTtsUpperVertebra] = useState('');
  const [ttsLowerVertebra, setTtsLowerVertebra] = useState('');

  const measurementTools = tools.filter(tool => !isAuxiliaryTool(tool.id));
  const auxiliaryTools = tools.filter(tool => isAuxiliaryTool(tool.id));
  const keypointGroups = getKeypointGroupsForExamType(examType);
  const keypointIds = new Set(keypoints.map(keypoint => keypoint.id));
  const hasAvt = measurements.some(item => item.type.toLowerCase() === 'avt');
  const hasTts = measurements.some(item => item.type.toLowerCase() === 'tts');
  const hasSacralLine =
    hasKeypoint(keypoints, 'SL') && hasKeypoint(keypoints, 'SR');
  const isAnteriorView = isAnteriorExamType(examType);
  const canCreateAvt =
    isAnteriorView &&
    !hasAvt &&
    hasSacralLine &&
    completeVertebraGroups.length >= 1;
  const canCreateTts =
    isAnteriorView &&
    !hasTts &&
    hasSacralLine &&
    completeVertebraGroups.length >= 2;
  const canCreateCobb = isAnteriorView && completeVertebraGroups.length >= 2;
  const hasAvailableVertebraCenter = completeVertebraGroups.some(
    group =>
      !measurements.some(
        item => item.type === 'vertebra-center' && item.upperVertebra === group
      )
  );
  const vertebraCenterStatus: ToolStatus = hasAvailableVertebraCenter
    ? 'available'
    : completeVertebraGroups.length > 0
      ? 'exists'
      : 'missing-keypoints';
  const avtStatus: ToolStatus = canCreateAvt
    ? 'available'
    : hasAvt
      ? 'exists'
      : 'missing-keypoints';
  const ttsStatus: ToolStatus = canCreateTts
    ? 'available'
    : hasTts
      ? 'exists'
      : 'missing-keypoints';
  const selectedKeypointGroup = keypointGroups.find(
    group => group.id === openKeypointGroup
  );

  const renderAvailabilityBadge = (isAvailable: boolean) => (
    <div
      className={`absolute -bottom-1 -right-1 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center ${
        isAvailable ? 'bg-emerald-500' : 'bg-gray-600'
      }`}
    >
      <i
        className={`${isAvailable ? 'ri-check-line' : 'ri-subtract-line'} text-[10px]`}
      ></i>
    </div>
  );

  const toolTabs: { id: ToolTab; label: string; icon: string }[] = [
    { id: 'measurement', label: '测量工具', icon: 'ri-ruler-line' },
    { id: 'keypoint', label: '关键点', icon: 'ri-focus-3-line' },
  ];

  const getKeypointGroupTitle = (
    group: { id: string; name: string },
    isComplete: boolean
  ): string => {
    if (isComplete) return `${group.name}关键点已完整`;
    if (group.id === 'pose') return '选择姿态关键点';
    if (group.id === 'S1') return '选择S1上终板关键点';
    if (group.id === 'CFH') return '选择股骨头中心关键点';
    return `选择${group.name}椎体的关键点`;
  };

  const getUnavailableTitle = (
    toolName: string,
    status: ToolStatus
  ): string => {
    if (status === 'exists') return `${toolName} 已存在`;
    if (status === 'missing-keypoints') return `${toolName} 缺少关键点`;
    return `${toolName} 可用`;
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex-1 overflow-y-auto">
        <h3 className="font-semibold text-white mb-3">测量工具 - {examType}</h3>

        <div className="mb-4">
          {/* 基础移动模式 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5 leading-none">
              <i className="ri-hand-line w-4 h-4 inline-flex items-center justify-center text-sm leading-none"></i>
              <span className="leading-none">基础模式</span>
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
              manualBindingSelectedPointsCount={
                manualBindingSelectedPointsCount
              }
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

          <div className="mb-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-900/70 p-1 mb-3">
              {toolTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveToolTab(tab.id);
                    setOpenMeasurementTool(null);
                    setOpenKeypointGroup(null);
                  }}
                  className={`h-9 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${
                    activeToolTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <i className={`${tab.icon} text-sm`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {activeToolTab === 'measurement' && (
              <div>
                {measurementTools.length > 0 && (
                  <div className="relative mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5 leading-none">
                      <i className="ri-ruler-line w-4 h-4 inline-flex items-center justify-center text-sm leading-none"></i>
                      <span className="leading-none">测量标注</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {measurementTools.map(tool => {
                        const isUniquenessBlocked = hasUniqueAnnotationForTool(
                          measurements,
                          tool
                        );
                        const isCobbTool = isAnteriorView && tool.id === 'cobb';
                        const isAutomaticTool =
                          !isCobbTool &&
                          (isApAutomaticMeasurementTool(tool.id) ||
                            isLateralRestorableMeasurementTool(tool.id));
                        const isSelectionTool =
                          tool.id === 'vertebra-center' ||
                          isCobbTool ||
                          (isAnteriorView &&
                            (tool.id === 'avt' || tool.id === 'tts'));
                        const isOpen = openMeasurementTool === tool.id;
                        const automaticStatus =
                          automaticToolStatus[tool.id] ?? 'missing-keypoints';
                        const selectionStatus =
                          tool.id === 'vertebra-center'
                            ? vertebraCenterStatus
                            : isCobbTool
                              ? canCreateCobb
                                ? 'available'
                                : 'missing-keypoints'
                              : tool.id === 'avt'
                                ? avtStatus
                                : tool.id === 'tts'
                                  ? ttsStatus
                                  : 'available';
                        const unavailableStatus = isSelectionTool
                          ? selectionStatus
                          : isUniquenessBlocked
                            ? 'exists'
                            : 'missing-keypoints';
                        const isToolAvailable = isAutomaticTool
                          ? automaticStatus === 'available'
                          : isCobbTool
                            ? canCreateCobb
                            : tool.id === 'vertebra-center'
                              ? hasAvailableVertebraCenter
                              : tool.id === 'avt'
                                ? canCreateAvt
                                : tool.id === 'tts'
                                  ? canCreateTts
                                  : !isUniquenessBlocked;
                        const toolTitle = isAutomaticTool
                          ? isToolAvailable
                            ? `${tool.name} 可恢复，点击自动生成`
                            : getUnavailableTitle(tool.name, automaticStatus)
                          : !isToolAvailable &&
                              (isUniqueAnnotationTool(tool.id) ||
                                isSelectionTool)
                            ? getUnavailableTitle(tool.name, unavailableStatus)
                            : isSelectionTool
                              ? isCobbTool
                                ? '点击选择 Cobb 上端椎和下端椎'
                                : '点击选择可用对象'
                              : tool.description;

                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              if (!isToolAvailable) return;
                              if (isAutomaticTool) {
                                setOpenMeasurementTool(null);
                                onRestoreAutomaticMeasurement(tool.id);
                                return;
                              }
                              if (isSelectionTool) {
                                setOpenMeasurementTool(isOpen ? null : tool.id);
                                setOpenKeypointGroup(null);
                                return;
                              }
                              setOpenMeasurementTool(null);
                              onSelectTool(tool.id);
                            }}
                            disabled={!isToolAvailable}
                            className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                              !isToolAvailable
                                ? 'bg-gray-700/60 text-gray-500 cursor-not-allowed opacity-55'
                                : selectedTool === tool.id || isOpen
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={toolTitle}
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
                              <IconMapper
                                iconId={tool.icon}
                                className="text-lg mb-1"
                                style={{
                                  lineHeight: '1',
                                  width: '1.25rem',
                                  height: '1.25rem',
                                }}
                              />
                              <span
                                className="text-xs text-center"
                                style={{ lineHeight: '1' }}
                              >
                                {tool.name}
                              </span>
                            </div>
                            {renderAvailabilityBadge(isToolAvailable)}
                            {(selectedTool === tool.id || isOpen) &&
                              isToolAvailable && (
                                <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -left-1 bg-blue-500 rounded-full"></i>
                              )}
                          </button>
                        );
                      })}
                    </div>

                    {openMeasurementTool === 'vertebra-center' && (
                      <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto">
                        <div className="text-xs text-gray-300 mb-2">
                          椎体中心
                        </div>
                        {completeVertebraGroups.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {completeVertebraGroups.map(group => {
                              const exists = measurements.some(
                                item =>
                                  item.type === 'vertebra-center' &&
                                  item.upperVertebra === group
                              );
                              return (
                                <button
                                  key={group}
                                  type="button"
                                  onClick={() => {
                                    if (!exists) {
                                      onCreateVertebraCenter(group);
                                      setOpenMeasurementTool(null);
                                    }
                                  }}
                                  disabled={exists}
                                  className={`h-8 rounded text-xs ${
                                    exists
                                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                      : 'bg-gray-800 text-white hover:bg-gray-700'
                                  }`}
                                >
                                  {group}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            暂无完整椎体关键点
                          </span>
                        )}
                      </div>
                    )}

                    {openMeasurementTool === 'cobb' && (
                      <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(28rem,calc(100vh-14rem))] overflow-y-auto">
                        <div className="text-xs text-gray-300 mb-2">Cobb</div>
                        <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">
                              上端椎
                            </div>
                            {completeVertebraGroups.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {completeVertebraGroups.map(group => (
                                  <button
                                    key={group}
                                    type="button"
                                    onClick={() => setCobbUpperVertebra(group)}
                                    disabled={!canCreateCobb}
                                    className={`h-8 rounded text-xs ${
                                      !canCreateCobb
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : cobbUpperVertebra === group
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-800 text-white hover:bg-gray-700'
                                    }`}
                                  >
                                    {group}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                暂无完整椎体关键点
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">
                              下端椎
                            </div>
                            {completeVertebraGroups.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {completeVertebraGroups.map(group => (
                                  <button
                                    key={group}
                                    type="button"
                                    onClick={() => setCobbLowerVertebra(group)}
                                    disabled={!canCreateCobb}
                                    className={`h-8 rounded text-xs ${
                                      !canCreateCobb
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : cobbLowerVertebra === group
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-800 text-white hover:bg-gray-700'
                                    }`}
                                  >
                                    {group}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                暂无完整椎体关键点
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onCreateCobb(
                                cobbUpperVertebra,
                                cobbLowerVertebra
                              );
                              setOpenMeasurementTool(null);
                            }}
                            disabled={
                              !canCreateCobb ||
                              !cobbUpperVertebra ||
                              !cobbLowerVertebra ||
                              cobbUpperVertebra === cobbLowerVertebra
                            }
                            className="w-full h-8 rounded bg-blue-600 text-white text-xs disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-blue-700"
                          >
                            创建 Cobb
                          </button>
                        </div>
                      </div>
                    )}

                    {openMeasurementTool === 'avt' && (
                      <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto">
                        <div className="text-xs text-gray-300 mb-2">
                          选择顶椎
                        </div>
                        {completeVertebraGroups.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {completeVertebraGroups.map(group => (
                              <button
                                key={group}
                                type="button"
                                onClick={() => {
                                  onCreateAvt(group);
                                  setOpenMeasurementTool(null);
                                }}
                                disabled={!canCreateAvt}
                                className={`h-8 rounded text-xs ${
                                  !canCreateAvt
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-800 text-white hover:bg-gray-700'
                                }`}
                              >
                                {group}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            暂无完整椎体关键点
                          </span>
                        )}
                      </div>
                    )}

                    {openMeasurementTool === 'tts' && (
                      <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(28rem,calc(100vh-14rem))] overflow-y-auto">
                        <div className="text-xs text-gray-300 mb-2">TTS</div>
                        <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">
                              上端椎
                            </div>
                            {completeVertebraGroups.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {completeVertebraGroups.map(group => (
                                  <button
                                    key={group}
                                    type="button"
                                    onClick={() => setTtsUpperVertebra(group)}
                                    disabled={!canCreateTts}
                                    className={`h-8 rounded text-xs ${
                                      !canCreateTts
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : ttsUpperVertebra === group
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-800 text-white hover:bg-gray-700'
                                    }`}
                                  >
                                    {group}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                暂无完整椎体关键点
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">
                              下端椎
                            </div>
                            {completeVertebraGroups.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {completeVertebraGroups.map(group => (
                                  <button
                                    key={group}
                                    type="button"
                                    onClick={() => setTtsLowerVertebra(group)}
                                    disabled={!canCreateTts}
                                    className={`h-8 rounded text-xs ${
                                      !canCreateTts
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : ttsLowerVertebra === group
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-800 text-white hover:bg-gray-700'
                                    }`}
                                  >
                                    {group}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                暂无完整椎体关键点
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onCreateTts(ttsUpperVertebra, ttsLowerVertebra);
                              setOpenMeasurementTool(null);
                            }}
                            disabled={
                              !canCreateTts ||
                              !ttsUpperVertebra ||
                              !ttsLowerVertebra ||
                              ttsUpperVertebra === ttsLowerVertebra
                            }
                            className="w-full h-8 rounded bg-blue-600 text-white text-xs disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-blue-700"
                          >
                            创建 TTS
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {auxiliaryTools.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5 leading-none">
                      <i className="ri-shape-line w-4 h-4 inline-flex items-center justify-center text-sm leading-none"></i>
                      <span className="leading-none">辅助图形</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {auxiliaryTools.map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setOpenMeasurementTool(null);
                            onSelectTool(tool.id);
                          }}
                          className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                            selectedTool === tool.id
                              ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
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
                            <IconMapper
                              iconId={tool.icon}
                              className="text-lg mb-1"
                              style={{
                                lineHeight: '1',
                                width: '1.25rem',
                                height: '1.25rem',
                              }}
                            />
                            <span
                              className="text-xs text-center"
                              style={{ lineHeight: '1' }}
                            >
                              {tool.name
                                .replace('Auxiliary ', '')
                                .replace('Polygons', '多边形')}
                            </span>
                          </div>
                          {renderAvailabilityBadge(true)}
                          {selectedTool === tool.id && (
                            <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -left-1 bg-blue-500 rounded-full"></i>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeToolTab === 'keypoint' && (
              <div className="relative">
                {!canUseKeypointTools && (
                  <div className="mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-200">
                    当前账号无关键点标注权限
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {keypointGroups.map(group => {
                    const isOpen = openKeypointGroup === group.id;
                    const existingCount = group.keypoints.filter(keypoint =>
                      keypointIds.has(keypoint.id)
                    ).length;
                    const isCompleteKeypointGroup =
                      existingCount === group.keypoints.length;
                    const isGroupAvailable =
                      canUseKeypointTools && !isCompleteKeypointGroup;

                    return (
                      <div key={group.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isGroupAvailable) return;
                            setOpenKeypointGroup(isOpen ? null : group.id);
                            setOpenMeasurementTool(null);
                          }}
                          disabled={!isGroupAvailable}
                          className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col items-center justify-center ${
                            !isGroupAvailable
                              ? 'bg-gray-700/60 text-gray-500 cursor-not-allowed opacity-55'
                              : isOpen
                                ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                          title={getKeypointGroupTitle(
                            group,
                            isCompleteKeypointGroup
                          )}
                        >
                          <i className="ri-focus-3-line text-lg mb-1"></i>
                          <span className="text-xs leading-none">
                            {group.name}
                          </span>
                          <span className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-xs rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                            {existingCount}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {selectedKeypointGroup && canUseKeypointTools && (
                  <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto">
                    <div className="text-xs text-gray-300 mb-2">
                      {selectedKeypointGroup.name}
                    </div>
                    <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-4 gap-2">
                      {selectedKeypointGroup.keypoints.map(keypoint => {
                        const exists = keypointIds.has(keypoint.id);
                        return (
                          <button
                            key={keypoint.id}
                            type="button"
                            onClick={() => {
                              if (!exists) {
                                onSelectTool(`keypoint:${keypoint.id}`);
                                setOpenKeypointGroup(null);
                              }
                            }}
                            disabled={exists}
                            className={`h-8 rounded text-xs ${
                              exists
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : selectedTool === `keypoint:${keypoint.id}`
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-800 text-white hover:bg-gray-700'
                            }`}
                          >
                            {keypoint.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
                onChange={event =>
                  onChangeStandardDistanceValue(event.target.value)
                }
                onBlur={onStandardDistanceInputBlur}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    onStandardDistanceInputEnter();
                  }
                }}
                placeholder="例如: 100"
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 text-white text-sm rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              {standardDistance !== null &&
                standardDistancePointsLength === 2 && (
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
                  onChange={event =>
                    onChangeTreatmentAdvice(event.target.value)
                  }
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
