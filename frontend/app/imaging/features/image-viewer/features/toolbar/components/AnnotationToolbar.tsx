'use client';

import { useMemo, useState } from 'react';
import BindingPanel from '@/app/imaging/features/image-viewer/features/bindings/components/BindingPanel';
import ReportPanel from '@/app/imaging/features/image-viewer/features/report/components/ReportPanel';
import { AnnotationBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { isApAutomaticMeasurementTool } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements';
import { isAuxiliaryTool } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary';
import { isLateralRestorableMeasurementTool } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements';
import { isUniqueAnnotationTool } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  getKeypointGroupsForExamType,
  hasKeypoint,
  isAnteriorExamType,
  isLateralExamType,
  type KeypointAnnotation,
  type VertebraCornerOrderMapping,
  type VertebraCornerSequenceNumber,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { MeasurementData, Tool } from '@/app/imaging/features/image-viewer/shared/types';
import IconMapper from '@/app/imaging/features/image-viewer/features/toolbar/components/icons/IconMapper';
import BasicModePanel from '@/app/imaging/features/image-viewer/features/toolbar/components/BasicModePanel';
import {
  BasicMode,
  DEFAULT_BASIC_MODES,
  NON_DERIVE_BASIC_MODES,
} from '@/app/imaging/features/image-viewer/features/toolbar/components/basic-mode';
import ToolbarToolPanel, {
  getEffectiveToolTab,
  shouldShowAuxiliaryTools,
  ToolTab,
} from '@/app/imaging/features/image-viewer/features/toolbar/components/ToolbarToolPanel';
import { hasCobbMeasurementForEndpoints } from '@/app/imaging/features/image-viewer/features/keypoints/usecases/keypointMeasurementUseCase';
import {
  getCompleteMeasurementDeriveEndpointGroups,
  getLateralNamedCobbMeasurementRuleByEndpoints,
  isValidMeasurementDeriveEndpointOrder,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-derive';

type ToolStatus = 'available' | 'exists' | 'missing-keypoints';

const VERTEBRA_CORNER_SEQUENCE_NUMBERS = [1, 2, 3, 4] as const;
const DERIVE_COBB_TOOL: Tool = {
  id: 'cobb',
  name: 'Cobb',
  icon: 'medical-cobb',
  description: 'Cobb角测量',
  pointsNeeded: 4,
};
const DEFAULT_RECTIFY_SEQUENCE_BY_FROM: Record<
  VertebraCornerSequenceNumber,
  VertebraCornerSequenceNumber
> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

function isVertebraCornerSequenceNumber(
  value: number
): value is VertebraCornerSequenceNumber {
  return VERTEBRA_CORNER_SEQUENCE_NUMBERS.some(index => index === value);
}

function isRectifiableKeypointGroup(group: {
  keypoints: { id: string }[];
}): boolean {
  return group.keypoints.length === VERTEBRA_CORNER_SEQUENCE_NUMBERS.length;
}

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
  onCreateVertebraCenter: (vertebra: string) => void;
  onCreateCobb: (upperVertebra: string, lowerVertebra: string) => void;
  onRectifyVertebraCornerOrder: (
    vertebra: string,
    mapping: VertebraCornerOrderMapping[]
  ) => void;
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
  onCreateVertebraCenter,
  onCreateCobb,
  onRectifyVertebraCornerOrder,
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
  const [currentBasicMode, setCurrentBasicMode] = useState<BasicMode>(
    BasicMode.Move
  );
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('measurement');
  const [openKeypointGroup, setOpenKeypointGroup] = useState<string | null>(
    null
  );
  const [openMeasurementTool, setOpenMeasurementTool] = useState<string | null>(
    null
  );
  const [cobbUpperVertebra, setCobbUpperVertebra] = useState('');
  const [cobbLowerVertebra, setCobbLowerVertebra] = useState('');
  const [toolbarOverlayMessage, setToolbarOverlayMessage] = useState<
    string | null
  >(null);
  const [rectifySequenceByFrom, setRectifySequenceByFrom] = useState<
    Record<VertebraCornerSequenceNumber, VertebraCornerSequenceNumber>
  >(DEFAULT_RECTIFY_SEQUENCE_BY_FROM);

  const isAnteriorView = isAnteriorExamType(examType);
  const isLateralView = isLateralExamType(examType);
  const canUseMeasurementDeriveMode = isAnteriorView || isLateralView;
  const availableBasicModes = useMemo(
    () =>
      canUseMeasurementDeriveMode
        ? DEFAULT_BASIC_MODES
        : NON_DERIVE_BASIC_MODES,
    [canUseMeasurementDeriveMode]
  );
  const effectiveBasicMode = availableBasicModes.includes(currentBasicMode)
    ? currentBasicMode
    : BasicMode.Move;
  const measurementTools = tools.filter(tool => !isAuxiliaryTool(tool.id));
  const auxiliaryTools = tools.filter(tool => isAuxiliaryTool(tool.id));
  const keypointGroups = getKeypointGroupsForExamType(examType);
  const keypointIds = new Set(keypoints.map(keypoint => keypoint.id));
  const measurementTypeIds = new Set(
    measurements.map(measurement => getAnnotationTypeId(measurement.type))
  );
  const hasAvt = measurements.some(item => item.type.toLowerCase() === 'avt');
  const hasSacralLine =
    hasKeypoint(keypoints, 'SL') && hasKeypoint(keypoints, 'SR');
  const visibleMeasurementTools =
    effectiveBasicMode === BasicMode.MeasurementDerive
      ? [measurementTools.find(tool => tool.id === 'cobb') ?? DERIVE_COBB_TOOL]
      : measurementTools;
  const completeCobbEndpointOptions =
    getCompleteMeasurementDeriveEndpointGroups(keypoints, examType);
  const defaultCobbUpper = completeCobbEndpointOptions[0] ?? '';
  const defaultCobbLower =
    completeCobbEndpointOptions.find(group => group !== defaultCobbUpper) ?? '';
  const selectedCobbUpper = completeCobbEndpointOptions.includes(
    cobbUpperVertebra
  )
    ? cobbUpperVertebra
    : defaultCobbUpper;
  const selectedCobbLower =
    completeCobbEndpointOptions.includes(cobbLowerVertebra) &&
    cobbLowerVertebra !== selectedCobbUpper
      ? cobbLowerVertebra
      : completeCobbEndpointOptions.find(group => group !== selectedCobbUpper) ??
        defaultCobbLower;
  const canOpenCobbDerivePanel = completeCobbEndpointOptions.length >= 2;
  const canApplyCobbDerive =
    Boolean(selectedCobbUpper && selectedCobbLower) &&
    selectedCobbUpper !== selectedCobbLower;
  const canCreateAvt =
    isAnteriorView &&
    !hasAvt &&
    hasSacralLine &&
    completeVertebraGroups.length >= 1;
  const avtStatus: ToolStatus = canCreateAvt
    ? 'available'
    : hasAvt
      ? 'exists'
      : 'missing-keypoints';
  const effectiveToolTab = getEffectiveToolTab(effectiveBasicMode, activeToolTab);
  const canShowAuxiliaryTools = shouldShowAuxiliaryTools(effectiveBasicMode);
  const isRectifyMode = effectiveBasicMode === BasicMode.VertebraCornerRectify;
  const visibleKeypointGroups = isRectifyMode
    ? keypointGroups.filter(isRectifiableKeypointGroup)
    : keypointGroups;
  const selectedKeypointGroup = visibleKeypointGroups.find(
    group => group.id === openKeypointGroup
  );

  const closeToolPopovers = () => {
    setOpenMeasurementTool(null);
    setOpenKeypointGroup(null);
    setToolbarOverlayMessage(null);
    setRectifySequenceByFrom({ ...DEFAULT_RECTIFY_SEQUENCE_BY_FROM });
  };

  const handleBasicModeSelect = (mode: BasicMode) => {
    setCurrentBasicMode(mode);
    closeToolPopovers();
    onActivateHandMode();
  };

  const handleToolTabChange = (tab: ToolTab) => {
    setActiveToolTab(tab);
    closeToolPopovers();
  };

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

  const getRectifyKeypointGroupTitle = (
    group: { name: string; keypoints: { id: string }[] },
    isComplete: boolean
  ): string => {
    if (group.keypoints.length !== 4 || !isComplete) {
      return `${group.name}的四个关键点尚不完整!`;
    }
    return `纠正${group.name}的序号`;
  };

  const handleRectifySequenceChange = (
    from: VertebraCornerSequenceNumber,
    value: string
  ) => {
    const parsed = Number(value);
    if (!isVertebraCornerSequenceNumber(parsed)) return;
    setRectifySequenceByFrom(current => ({
      ...current,
      [from]: parsed,
    }));
  };

  const buildRectifyMapping = (): VertebraCornerOrderMapping[] =>
    VERTEBRA_CORNER_SEQUENCE_NUMBERS.map(from => ({
      from,
      to: rectifySequenceByFrom[from],
    }));

  const getMissingRectifyTargets = (
    mapping: VertebraCornerOrderMapping[]
  ): VertebraCornerSequenceNumber[] => {
    const targets = new Set(mapping.map(item => item.to));
    return VERTEBRA_CORNER_SEQUENCE_NUMBERS.filter(
      index => !targets.has(index)
    );
  };

  const handleApplyRectifySequence = () => {
    if (!selectedKeypointGroup) return;

    const mapping = buildRectifyMapping();
    const missingTargets = getMissingRectifyTargets(mapping);
    if (missingTargets.length > 0) {
      setToolbarOverlayMessage(
        `椎体缺少序号${missingTargets.join(',')}, 请检查您输入的序号!`
      );
      return;
    }

    onRectifyVertebraCornerOrder(selectedKeypointGroup.name, mapping);
    setOpenKeypointGroup(null);
    setRectifySequenceByFrom({ ...DEFAULT_RECTIFY_SEQUENCE_BY_FROM });
  };

  const openCobbDerivePanel = (isOpen: boolean) => {
    setOpenMeasurementTool(isOpen ? null : 'cobb');
    setOpenKeypointGroup(null);
    setToolbarOverlayMessage(null);
    setCobbUpperVertebra(selectedCobbUpper);
    setCobbLowerVertebra(selectedCobbLower);
  };

  const handleCobbUpperChange = (value: string) => {
    setCobbUpperVertebra(value);
    setCobbLowerVertebra(current => {
      if (current && current !== value && completeCobbEndpointOptions.includes(current)) {
        return current;
      }
      return completeCobbEndpointOptions.find(group => group !== value) ?? '';
    });
  };

  const handleApplyCobbDerive = () => {
    if (!canApplyCobbDerive) return;

    if (
      !isValidMeasurementDeriveEndpointOrder(
        selectedCobbUpper,
        selectedCobbLower
      )
    ) {
      setToolbarOverlayMessage(
        '上端椎不应该比下端椎更靠下或与下端椎相同!'
      );
      return;
    }

    const namedLateralCobbRule = isLateralView
      ? getLateralNamedCobbMeasurementRuleByEndpoints(
          selectedCobbUpper,
          selectedCobbLower
        )
      : null;
    if (namedLateralCobbRule) {
      setToolbarOverlayMessage(`${namedLateralCobbRule.name}已存在!`);
      return;
    }

    if (
      hasCobbMeasurementForEndpoints(
        measurements,
        selectedCobbUpper,
        selectedCobbLower
      )
    ) {
      setToolbarOverlayMessage(
        `Cobb${selectedCobbUpper}-${selectedCobbLower}已经存在, 不可重复派生!`
      );
      return;
    }

    onCreateCobb(selectedCobbUpper, selectedCobbLower);
    setOpenMeasurementTool(null);
    setToolbarOverlayMessage(null);
  };

  const getUnavailableTitle = (
    toolName: string,
    status: ToolStatus,
    missingKeypoints: string[] = []
  ): string => {
    if (status === 'exists') return `${toolName} 已存在`;
    if (status === 'missing-keypoints') {
      return missingKeypoints.length > 0
        ? `${toolName}缺少关键点:${missingKeypoints.join(', ')}`
        : `${toolName}缺少关键点`;
    }
    return `${toolName} 可用`;
  };

  const getMissingPointIds = (ids: string[]) =>
    ids.filter(id => !keypointIds.has(id));

  const getMissingVertebraPointIds = (vertebra: string) =>
    getMissingPointIds([1, 2, 3, 4].map(index => `${vertebra}-${index}`));

  const getMissingAnyCompleteVertebra = (minimumCount: number) =>
    completeVertebraGroups.length >= minimumCount
      ? []
      : [`至少${minimumCount}个完整椎体`];

  const getMissingKeypointsForTool = (toolId: string): string[] => {
    if (isAnteriorView) {
      if (toolId === 't1-tilt') return getMissingVertebraPointIds('T1');
      if (toolId === 'ca') return getMissingPointIds(['CL', 'CR']);
      if (toolId === 'po') return getMissingPointIds(['IL', 'IR']);
      if (toolId === 'css') return getMissingPointIds(['SL', 'SR']);
      if (toolId === 'ts') {
        return [
          ...getMissingVertebraPointIds('C7'),
          ...getMissingPointIds(['SL', 'SR']),
        ];
      }
      if (toolId === 'cobb') return getMissingAnyCompleteVertebra(2);
      if (toolId === 'vertebra-center') return getMissingAnyCompleteVertebra(1);
      if (toolId === 'avt') {
        return [
          ...getMissingPointIds(['SL', 'SR']),
          ...getMissingAnyCompleteVertebra(1),
        ];
      }
      if (toolId === 'tts') {
        return [
          ...getMissingPointIds(['SL', 'SR']),
          ...getMissingAnyCompleteVertebra(2),
        ];
      }
      return [];
    }

    if (toolId === 't1-slope') return getMissingVertebraPointIds('T1');
    if (toolId === 'cl') {
      return [
        ...getMissingVertebraPointIds('C2'),
        ...getMissingVertebraPointIds('C7'),
      ];
    }
    if (toolId === 'tk-t2-t5') {
      return [
        ...getMissingVertebraPointIds('T2'),
        ...getMissingVertebraPointIds('T5'),
      ];
    }
    if (toolId === 'tk-t5-t12') {
      return [
        ...getMissingVertebraPointIds('T5'),
        ...getMissingVertebraPointIds('T12'),
      ];
    }
    if (toolId === 't10-l2') {
      return [
        ...getMissingVertebraPointIds('T10'),
        ...getMissingVertebraPointIds('L2'),
      ];
    }
    if (toolId === 'll-l1-s1') {
      return [
        ...getMissingVertebraPointIds('L1'),
        ...getMissingPointIds(['S1-1', 'S1-2']),
      ];
    }
    if (toolId === 'll-l1-l4') {
      return [
        ...getMissingVertebraPointIds('L1'),
        ...getMissingVertebraPointIds('L4'),
      ];
    }
    if (toolId === 'll-l4-s1') {
      return [
        ...getMissingVertebraPointIds('L4'),
        ...getMissingPointIds(['S1-1', 'S1-2']),
      ];
    }
    if (toolId === 'sva') {
      return [
        ...getMissingVertebraPointIds('C7'),
        ...getMissingPointIds(['S1-2']),
      ];
    }
    if (toolId === 'tpa') {
      return [
        ...getMissingVertebraPointIds('T1'),
        ...getMissingPointIds(['CFH', 'S1-1', 'S1-2']),
      ];
    }
    if (toolId === 'pi' || toolId === 'pt') {
      return getMissingPointIds(['CFH', 'S1-1', 'S1-2']);
    }
    if (toolId === 'ss') return getMissingPointIds(['S1-1', 'S1-2']);
    if (toolId === 'vertebra-center') return getMissingAnyCompleteVertebra(1);

    return [];
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex-1 overflow-y-auto">
        <h3 className="font-semibold text-white mb-3">测量工具 - {examType}</h3>

        <div className="mb-4">
          <div className="mb-4">
            <BasicModePanel
              modes={availableBasicModes}
              currentMode={effectiveBasicMode}
              isImagePanLocked={isImagePanLocked}
              onSelectMode={handleBasicModeSelect}
              onToggleImagePanLocked={onToggleImagePanLocked}
            />

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

          <ToolbarToolPanel
            currentBasicMode={effectiveBasicMode}
            activeToolTab={activeToolTab}
            onToolTabChange={handleToolTabChange}
          >
            {effectiveToolTab === 'measurement' && (
              <div>
                {visibleMeasurementTools.length > 0 && (
                  <div className="relative mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5 leading-none">
                      <i className="ri-ruler-line w-4 h-4 inline-flex items-center justify-center text-sm leading-none"></i>
                      <span className="leading-none">测量标注</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {visibleMeasurementTools.map(tool => {
                        const isUniquenessBlocked =
                          isUniqueAnnotationTool(tool.id) &&
                          measurementTypeIds.has(
                            getAnnotationTypeId(tool.id)
                          );
                        const isCobbTool = isAnteriorView && tool.id === 'cobb';
                        // 可推导工具走自动恢复路径；Cobb 始终走手动放点路径，
                        // 端椎在结果列表中后置填写。
                        const isAutomaticTool =
                          canUseKeypointTools &&
                          !isCobbTool &&
                          (isApAutomaticMeasurementTool(tool.id) ||
                            isLateralRestorableMeasurementTool(tool.id));
                        // AVT 走选择面板（需要骶骨线关键点）。
                        // TTS 走直接放点路径（画水平线，骶骨参考继承自 CSS/SL/SR），不走椎体选择面板。
                        const isSelectionTool =
                          canUseKeypointTools &&
                          isAnteriorView &&
                          tool.id === 'avt';
                        const isOpen = openMeasurementTool === tool.id;
                        const isCobbDeriveTool =
                          effectiveBasicMode === BasicMode.MeasurementDerive &&
                          tool.id === 'cobb';
                        const automaticStatus =
                          automaticToolStatus[tool.id] ?? 'missing-keypoints';
                        const missingKeypoints = getMissingKeypointsForTool(
                          tool.id
                        );
                        // 仅当 AI 推导数据确实可恢复时才走自动路径；
                        // missing-keypoints 时回退为手动放点，允许补充标注。
                        // exists 状态（测量已存在）保持禁用，用户应直接拖拽现有端点调整。
                        const isLockedByExistingMeasurement =
                          isUniquenessBlocked ||
                          (isAutomaticTool && automaticStatus === 'exists');
                        const isEffectivelyAutomaticTool =
                          isAutomaticTool &&
                          automaticStatus === 'available' &&
                          !isLockedByExistingMeasurement;
                        // 手动放点回退模式：仅在无 AI 数据时生效
                        const isInManualFallbackMode =
                          isAutomaticTool &&
                          automaticStatus === 'missing-keypoints' &&
                          !isLockedByExistingMeasurement;
                        const selectionStatus =
                          tool.id === 'avt' ? avtStatus : 'available';
                        const unavailableStatus = isSelectionTool
                          ? selectionStatus
                          : isLockedByExistingMeasurement
                            ? 'exists'
                            : 'missing-keypoints';
                        // 手动回退模式：始终可用（允许重新放置或补充放置）。
                        // 其他工具（含 Cobb、TTS）按唯一性规则判断。
                        const isToolAvailable = isCobbDeriveTool
                          ? canOpenCobbDerivePanel
                          : isLockedByExistingMeasurement
                            ? false
                            : isEffectivelyAutomaticTool
                              ? true
                              : isInManualFallbackMode
                                ? true
                                : tool.id === 'avt'
                                  ? canUseKeypointTools
                                    ? canCreateAvt
                                    : !isUniquenessBlocked
                                  : !isUniquenessBlocked;
                        const toolTitle = isCobbDeriveTool
                          ? canOpenCobbDerivePanel
                            ? '选择 Cobb 上下端椎'
                            : 'Cobb至少需要2个完整椎体'
                          : isEffectivelyAutomaticTool
                            ? `${tool.name} 可恢复，点击自动生成`
                            : isInManualFallbackMode
                              ? tool.description
                              : !isToolAvailable &&
                                  (isUniqueAnnotationTool(tool.id) ||
                                    isSelectionTool)
                                ? getUnavailableTitle(
                                    tool.name,
                                    unavailableStatus,
                                    missingKeypoints
                                  )
                                : isSelectionTool
                                  ? '点击选择可用对象'
                                  : tool.description;

                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              if (!isToolAvailable) return;
                              if (isCobbDeriveTool) {
                                openCobbDerivePanel(isOpen);
                                return;
                              }
                              // 仅在 AI 数据真正可恢复时走自动路径；否则手动放点。
                              if (isEffectivelyAutomaticTool) {
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
                                ? 'bg-gray-700/60 text-gray-500 cursor-not-allowed opacity-60'
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
                                className={`text-lg mb-1 ${
                                  !isToolAvailable
                                    ? 'opacity-40 grayscale'
                                    : ''
                                }`}
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
                            {/* 放点数量下标 */}
                            {tool.pointsNeeded != null &&
                              tool.pointsNeeded > 0 && (
                                <div className="absolute -bottom-1 -left-1 bg-gray-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                  {tool.pointsNeeded}
                                </div>
                              )}
                            {(selectedTool === tool.id || isOpen) &&
                              isToolAvailable && (
                                <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -left-1 bg-blue-500 rounded-full"></i>
                              )}
                          </button>
                        );
                      })}
                    </div>

                    {openMeasurementTool === 'cobb' &&
                      effectiveBasicMode === BasicMode.MeasurementDerive && (
                        <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto">
                          <div className="text-xs text-gray-300 mb-3">
                            派生Cobb
                          </div>
                          {completeCobbEndpointOptions.length >= 2 ? (
                            <>
                              <div className="space-y-3">
                                <label className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs text-gray-300">
                                  <span>上端椎</span>
                                  <select
                                    aria-label="上端椎"
                                    value={selectedCobbUpper}
                                    onChange={event =>
                                      handleCobbUpperChange(event.target.value)
                                    }
                                    className="h-8 rounded bg-gray-800 border border-gray-600 px-2 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                  >
                                    {completeCobbEndpointOptions.map(group => (
                                      <option key={group} value={group}>
                                        {group}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs text-gray-300">
                                  <span>下端椎</span>
                                  <select
                                    aria-label="下端椎"
                                    value={selectedCobbLower}
                                    onChange={event =>
                                      setCobbLowerVertebra(event.target.value)
                                    }
                                    className="h-8 rounded bg-gray-800 border border-gray-600 px-2 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                  >
                                    {completeCobbEndpointOptions.map(group => (
                                      <option
                                        key={group}
                                        value={group}
                                        disabled={group === selectedCobbUpper}
                                      >
                                        {group}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setOpenMeasurementTool(null)}
                                  className="h-8 rounded bg-gray-700 px-3 text-xs text-gray-300 hover:bg-gray-600"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={handleApplyCobbDerive}
                                  disabled={!canApplyCobbDerive}
                                  className={`h-8 rounded px-3 text-xs ${
                                    canApplyCobbDerive
                                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  应用派生
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">
                              暂无足够完整椎体关键点
                            </span>
                          )}
                        </div>
                      )}

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
                  </div>
                )}

                {canShowAuxiliaryTools && auxiliaryTools.length > 0 && (
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

            {effectiveToolTab === 'keypoint' && (
              <div className="relative">
                <div className="flex flex-wrap gap-2">
                  {visibleKeypointGroups.map(group => {
                    const isOpen = openKeypointGroup === group.id;
                    const existingCount = group.keypoints.filter(keypoint =>
                      keypointIds.has(keypoint.id)
                    ).length;
                    const isCompleteKeypointGroup =
                      existingCount === group.keypoints.length;
                    const isRectifiableGroup =
                      isRectifiableKeypointGroup(group);
                    const isGroupAvailable = isRectifyMode
                      ? isRectifiableGroup && isCompleteKeypointGroup
                      : !isCompleteKeypointGroup;

                    return (
                      <div key={group.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isGroupAvailable) return;
                            setOpenKeypointGroup(isOpen ? null : group.id);
                            setRectifySequenceByFrom({
                              ...DEFAULT_RECTIFY_SEQUENCE_BY_FROM,
                            });
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
                          title={
                            isRectifyMode
                              ? getRectifyKeypointGroupTitle(
                                  group,
                                  isCompleteKeypointGroup
                                )
                              : getKeypointGroupTitle(
                                  group,
                                  isCompleteKeypointGroup
                                )
                          }
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
                {selectedKeypointGroup && (
                  <div className="relative z-40 mt-2 rounded-lg border border-gray-600 bg-gray-900 shadow-xl p-3 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto">
                    {isRectifyMode ? (
                      <>
                        <div className="text-xs text-gray-300 mb-2">
                          纠正{selectedKeypointGroup.name}的序号
                        </div>
                        <div className="space-y-2">
                          {VERTEBRA_CORNER_SEQUENCE_NUMBERS.map(index => (
                            <div
                              key={index}
                              className="grid grid-cols-[3.5rem_auto_5.75rem] items-center justify-center gap-x-2 text-xs text-gray-300"
                            >
                              <span className="text-right tabular-nums">
                                {selectedKeypointGroup.name}-{index}
                              </span>
                              <span className="text-gray-500">-&gt;</span>
                              <label className="flex items-center gap-1">
                                <span>{selectedKeypointGroup.name}-</span>
                                <select
                                  aria-label={`${selectedKeypointGroup.name}-${index} 修改后序号`}
                                  value={rectifySequenceByFrom[index]}
                                  onChange={event =>
                                    handleRectifySequenceChange(
                                      index,
                                      event.target.value
                                    )
                                  }
                                  className="h-8 min-w-14 rounded bg-gray-800 border border-gray-600 px-2 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                >
                                  {VERTEBRA_CORNER_SEQUENCE_NUMBERS.map(
                                    option => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenKeypointGroup(null);
                              setRectifySequenceByFrom({
                                ...DEFAULT_RECTIFY_SEQUENCE_BY_FROM,
                              });
                            }}
                            className="h-8 rounded bg-gray-700 px-3 text-xs text-gray-300 hover:bg-gray-600"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyRectifySequence}
                            className="h-8 rounded bg-blue-600 px-3 text-xs text-white hover:bg-blue-500"
                          >
                            应用修改
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </ToolbarToolPanel>

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

          {toolbarOverlayMessage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-80 rounded-lg border border-gray-600 bg-gray-900 p-4 shadow-2xl">
                <div className="text-sm text-white">{toolbarOverlayMessage}</div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setToolbarOverlayMessage(null)}
                    className="h-8 rounded bg-blue-600 px-3 text-xs text-white hover:bg-blue-500"
                  >
                    知道了
                  </button>
                </div>
              </div>
            </div>
          )}

          <ReportPanel reportText={reportText} onCopy={onCopyReport} />
        </div>
      </div>
    </div>
  );
}
