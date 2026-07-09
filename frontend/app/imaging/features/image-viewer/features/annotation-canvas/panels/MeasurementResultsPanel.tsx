import { useMemo, useState } from 'react';
import {
  getAuxiliaryTagText,
  getDisplayName,
  hasCustomAuxiliaryTagText,
  isEditableAuxiliaryAnnotationType,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-metadata';
import {
  AnnotationSource,
  MeasurementData,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  compareAnatomicalKeypointIds,
  getKeypointGroupsForExamType,
  isLateralExamType,
  KeypointAnnotation,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  canSyncCobbMeasurementToKeypoints,
  hasSameCobbEndpointVertebrae,
} from '@/app/imaging/features/image-viewer/features/keypoints/usecases/cobbKeypointSyncUseCase';
import {
  getLateralNamedCobbMeasurementRuleByEndpoints,
  getMeasurementDeriveVertebraOrder,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-derive';
import { HoverState, SelectionState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/types';
import { AppMessageDialog } from '@/components/overlay/overlay-components';

type ResultsTab = 'measurements' | 'keypoints';

function isNumberedCobbMeasurement(type: string): boolean {
  return /^(?:lateral-)?cobb\d*$/i.test(type);
}

function normalizeEndpointValue(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

interface MeasurementResultsPanelProps {
  examType: string;
  showResults: boolean;
  hideAllLabels: boolean;
  hideAllAnnotations: boolean;
  isStandardDistanceHidden: boolean;
  standardDistance: number | null;
  standardDistancePoints: { x: number; y: number }[];
  measurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  selectionState: SelectionState;
  hoverState: HoverState;
  hiddenMeasurementIds: Set<string>;
  hiddenAnnotationIds: Set<string>;
  hiddenKeypointIds: Set<string>;
  onToggleResults: () => void;
  onToggleAllAnnotations: () => void;
  onToggleAllLabels: () => void;
  onToggleStandardDistanceVisibility: () => void;
  onToggleMeasurementAnnotation: (measurementId: string) => void;
  onToggleMeasurementLabel: (measurementId: string) => void;
  onMeasurementHover: (measurementId: string | null) => void;
  onMeasurementSelect: (measurementId: string) => void;
  onMeasurementDelete: (measurementId: string) => void;
  onKeypointHover: (keypointId: string | null) => void;
  onToggleKeypointVisibility: (keypointId: string) => void;
  onKeypointDelete: (keypointId: string) => void;
  onMeasurementUpdate?: (
    measurementId: string,
    updates: Partial<MeasurementData>
  ) => void;
  onCobbKeypointsSync?: (measurementId: string) => void;
}

/**
 * 左上角测量结果面板。
 * 面板交互与画布渲染弱耦合，单独抽离避免入口继续膨胀。
 */
export default function MeasurementResultsPanel({
  examType,
  showResults,
  hideAllLabels,
  hideAllAnnotations,
  isStandardDistanceHidden,
  standardDistance,
  standardDistancePoints,
  measurements,
  keypoints,
  selectionState,
  hoverState,
  hiddenMeasurementIds,
  hiddenAnnotationIds,
  hiddenKeypointIds,
  onToggleResults,
  onToggleAllAnnotations,
  onToggleAllLabels,
  onToggleStandardDistanceVisibility,
  onToggleMeasurementAnnotation,
  onToggleMeasurementLabel,
  onMeasurementHover,
  onMeasurementSelect,
  onMeasurementDelete,
  onKeypointHover,
  onToggleKeypointVisibility,
  onKeypointDelete,
  onMeasurementUpdate,
  onCobbKeypointsSync,
}: MeasurementResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('measurements');
  const [editingAuxiliaryName, setEditingAuxiliaryName] = useState<
    string | null
  >(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingCobbEndpoint, setEditingCobbEndpoint] = useState<{
    measurementId: string;
    field: 'upperVertebra' | 'lowerVertebra';
    anchor: {
      left: number;
      top: number;
      minWidth: number;
    };
  } | null>(null);
  const [panelOverlayMessage, setPanelOverlayMessage] = useState<string | null>(
    null
  );
  const cobbEndpointOptions = useMemo(
    () =>
      getKeypointGroupsForExamType(examType)
        .filter(group => getMeasurementDeriveVertebraOrder(group.name) !== null)
        .map(group => group.name)
        .sort(
          (left, right) =>
            getMeasurementDeriveVertebraOrder(left)! -
            getMeasurementDeriveVertebraOrder(right)!
        ),
    [examType]
  );

  const startEditingAuxiliaryName = (
    measurementId: string,
    currentValue: string
  ) => {
    if (!onMeasurementUpdate) return;
    setEditingCobbEndpoint(null);
    setEditingAuxiliaryName(measurementId);
    setEditingValue(currentValue);
  };

  const commitAuxiliaryNameEdit = () => {
    if (!editingAuxiliaryName || !onMeasurementUpdate) {
      setEditingAuxiliaryName(null);
      return;
    }
    const trimmed = editingValue.trim();
    if (trimmed.length > 0) {
      onMeasurementUpdate(editingAuxiliaryName, { description: trimmed });
    }
    setEditingAuxiliaryName(null);
  };

  const startEditingCobbEndpoint = (
    measurementId: string,
    field: 'upperVertebra' | 'lowerVertebra',
    anchorElement: HTMLElement
  ) => {
    if (!onMeasurementUpdate) return;
    const rect = anchorElement.getBoundingClientRect();
    const viewportWidth =
      typeof window === 'undefined' ? rect.left + 120 : window.innerWidth;
    const minWidth = Math.max(rect.width, 96);
    setEditingAuxiliaryName(null);
    setEditingCobbEndpoint(current =>
      current?.measurementId === measurementId && current.field === field
        ? null
        : {
            measurementId,
            field,
            anchor: {
              left: Math.max(4, Math.min(rect.left, viewportWidth - minWidth - 4)),
              top: rect.bottom + 4,
              minWidth,
            },
          }
    );
  };

  const selectCobbEndpoint = (
    measurement: MeasurementData,
    field: 'upperVertebra' | 'lowerVertebra',
    vertebra: string
  ) => {
    if (!onMeasurementUpdate) {
      setEditingCobbEndpoint(null);
      return;
    }

    const nextUpper =
      field === 'upperVertebra'
        ? vertebra
        : (measurement.upperVertebra?.trim() ?? '');
    const nextLower =
      field === 'lowerVertebra'
        ? vertebra
        : (measurement.lowerVertebra?.trim() ?? '');

    if (
      normalizeEndpointValue(nextUpper) &&
      normalizeEndpointValue(nextUpper) === normalizeEndpointValue(nextLower)
    ) {
      return;
    }

    if (isLateralExamType(examType)) {
      if (nextUpper && nextLower) {
        const namedLateralCobbRule =
          getLateralNamedCobbMeasurementRuleByEndpoints(
            nextUpper.toUpperCase(),
            nextLower.toUpperCase()
          );
        if (namedLateralCobbRule) {
          setPanelOverlayMessage(`${namedLateralCobbRule.name}已存在!`);
          setEditingCobbEndpoint(null);
          return;
        }
      }
    }

    onMeasurementUpdate(measurement.id, {
      [field]: vertebra,
    });
    setEditingCobbEndpoint(null);
  };

  const getMeasurementDisplayName = (measurement: MeasurementData): string => {
    const isEditableAuxiliary = isEditableAuxiliaryAnnotationType(
      measurement.type
    );
    const baseDisplayName =
      isEditableAuxiliary && hasCustomAuxiliaryTagText(measurement)
        ? getAuxiliaryTagText(measurement)
        : getDisplayName(measurement.type);

    if (isNumberedCobbMeasurement(measurement.type)) {
      const upper = measurement.upperVertebra?.trim() || '上端椎待定';
      const lower = measurement.lowerVertebra?.trim() || '下端椎待定';
      return `${baseDisplayName}(${upper}-${lower})`;
    }

    if (
      measurement.type.toLowerCase() === 'tts' &&
      measurement.upperVertebra &&
      measurement.lowerVertebra
    ) {
      return `TTS(${measurement.upperVertebra}-${measurement.lowerVertebra})`;
    }

    if (measurement.type.toLowerCase() === 'avt' && measurement.apexVertebra) {
      return `AVT(${measurement.apexVertebra})`;
    }

    return baseDisplayName;
  };

  const renderCobbEndpointEditor = (
    measurement: MeasurementData,
    field: 'upperVertebra' | 'lowerVertebra',
    value: string | null | undefined,
    placeholder: string
  ) => {
    const isEditing =
      editingCobbEndpoint?.measurementId === measurement.id &&
      editingCobbEndpoint.field === field;
    const actualValue = value?.trim() ?? '';
    const displayValue = actualValue || placeholder;

    if (isEditing) {
      return (
        <span
          className="mx-0.5 inline-flex"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setEditingCobbEndpoint(null);
            }
          }}
        >
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              setEditingCobbEndpoint(null);
            }}
            className="rounded border border-blue-300/60 bg-black/60 px-1 font-mono text-blue-100 outline-none hover:border-blue-200"
            title={`点击关闭${field === 'upperVertebra' ? '上端椎' : '下端椎'}选择`}
          >
            {displayValue}
          </button>
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          startEditingCobbEndpoint(measurement.id, field, event.currentTarget);
        }}
        className="mx-0.5 font-mono text-blue-300 underline decoration-blue-300 underline-offset-2 hover:text-blue-100 hover:decoration-blue-100"
        title={`点击修改${field === 'upperVertebra' ? '上端椎' : '下端椎'}`}
      >
        {displayValue}
      </button>
    );
  };

  const renderMeasurementName = (
    measurement: MeasurementData,
    displayName: string,
    isSelected: boolean,
    isHovered: boolean,
    isEditableAuxiliary: boolean,
    isEditingThisAuxName: boolean
  ) => {
    if (isNumberedCobbMeasurement(measurement.type)) {
      const cobbDisplayName = getDisplayName(measurement.type);
      return (
        <span
          className={`mr-2 flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap font-medium ${
            isSelected
              ? 'text-white'
              : isHovered
                ? 'text-yellow-300'
                : 'text-white/90'
          }`}
        >
          {cobbDisplayName}(
          {renderCobbEndpointEditor(
            measurement,
            'upperVertebra',
            measurement.upperVertebra,
            '上端椎待定'
          )}
          -
          {renderCobbEndpointEditor(
            measurement,
            'lowerVertebra',
            measurement.lowerVertebra,
            '下端椎待定'
          )}
          )
        </span>
      );
    }

    if (isEditingThisAuxName) {
      return (
        <input
          autoFocus
          value={editingValue}
          onChange={event => setEditingValue(event.target.value)}
          onBlur={commitAuxiliaryNameEdit}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitAuxiliaryNameEdit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setEditingAuxiliaryName(null);
            }
          }}
          onClick={event => event.stopPropagation()}
          className="flex-1 mr-2 min-w-0 bg-black/40 border border-white/40 rounded px-1 text-white outline-none focus:border-yellow-300"
        />
      );
    }

    if (isEditableAuxiliary && onMeasurementUpdate) {
      return (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            startEditingAuxiliaryName(measurement.id, displayName);
          }}
          title="点击编辑文字"
          className={`min-w-0 flex-1 truncate mr-2 font-medium text-left hover:text-yellow-300 hover:underline underline-offset-2 ${
            isSelected
              ? 'text-white'
              : isHovered
                ? 'text-yellow-300'
                : 'text-white/90'
          }`}
        >
          {displayName}
        </button>
      );
    }

    return (
      <span
        className={`min-w-0 flex-1 truncate mr-2 font-medium ${
          isSelected
            ? 'text-white'
            : isHovered
              ? 'text-yellow-300'
              : 'text-white/90'
        }`}
      >
        {displayName}
      </span>
    );
  };

  const renderCobbSyncButton = (measurement: MeasurementData) => {
    if (!isNumberedCobbMeasurement(measurement.type)) return null;

    const canSync =
      Boolean(onCobbKeypointsSync) &&
      canSyncCobbMeasurementToKeypoints(measurement);
    const disabledTitle = hasSameCobbEndpointVertebrae(measurement)
      ? 'Cobb 上端椎和下端椎不能相同'
      : '填写 Cobb 上下端椎后可同步检测层';
    return (
      <button
        type="button"
        disabled={!canSync}
        aria-label="同步检测层"
        onClick={event => {
          event.stopPropagation();
          if (!canSync) return;
          onCobbKeypointsSync?.(measurement.id);
        }}
        className={`inline-flex h-5 flex-shrink-0 items-center gap-1 rounded border px-1.5 text-[10px] transition-colors ${
          canSync
            ? 'border-blue-300/50 bg-blue-500/20 text-blue-100 hover:border-blue-200 hover:bg-blue-500/30'
            : 'cursor-not-allowed border-white/10 bg-white/5 text-white/35'
        }`}
        title={
          canSync
            ? '同步检测层'
            : disabledTitle
        }
      >
        <span
          aria-hidden="true"
          className="h-3 w-3 bg-current"
          style={{
            WebkitMask: "url('/icons/icon_sync.svg') center / contain no-repeat",
            mask: "url('/icons/icon_sync.svg') center / contain no-repeat",
          }}
        />
        <span className="whitespace-nowrap">同步检测层</span>
      </button>
    );
  };

  const sortedMeasurements = [...measurements].sort((left, right) => {
    const compareByDisplayName = () => {
      const byName = getMeasurementDisplayName(left).localeCompare(
        getMeasurementDisplayName(right)
      );
      return byName || left.id.localeCompare(right.id);
    };

    if (
      isNumberedCobbMeasurement(left.type) &&
      isNumberedCobbMeasurement(right.type)
    ) {
      const getEndpointOrder = (vertebra: string | null | undefined) =>
        getMeasurementDeriveVertebraOrder(normalizeEndpointValue(vertebra)) ??
        Number.MAX_SAFE_INTEGER;
      const byUpper =
        getEndpointOrder(left.upperVertebra) -
        getEndpointOrder(right.upperVertebra);
      const byLower =
        getEndpointOrder(left.lowerVertebra) -
        getEndpointOrder(right.lowerVertebra);

      return byUpper || byLower || compareByDisplayName();
    }

    return compareByDisplayName();
  });
  const sortedKeypoints = [...keypoints].sort((left, right) =>
    compareAnatomicalKeypointIds(left.id, right.id)
  );
  const editingCobbEndpointMeasurement = editingCobbEndpoint
    ? measurements.find(item => item.id === editingCobbEndpoint.measurementId)
    : null;
  const editingCobbEndpointValue =
    editingCobbEndpoint && editingCobbEndpointMeasurement
      ? (editingCobbEndpointMeasurement[editingCobbEndpoint.field]?.trim() ?? '')
      : '';
  const editingCobbOppositeEndpointValue =
    editingCobbEndpoint && editingCobbEndpointMeasurement
      ? normalizeEndpointValue(
          editingCobbEndpoint.field === 'upperVertebra'
            ? editingCobbEndpointMeasurement.lowerVertebra
            : editingCobbEndpointMeasurement.upperVertebra
        )
      : '';
  const editingCobbOppositeEndpointLabel =
    editingCobbEndpoint?.field === 'upperVertebra' ? '下端椎' : '上端椎';

  return (
    <div
      data-canvas-wheel-blocker
      className="absolute left-2 right-2 top-2 z-50 sm:left-4 sm:right-auto sm:top-4"
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onMouseUp={event => event.stopPropagation()}
      onMouseMove={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
      onPointerMove={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
    >
      <AppMessageDialog
        open={Boolean(panelOverlayMessage)}
        message={panelOverlayMessage}
        onClose={() => setPanelOverlayMessage(null)}
      />
      {editingCobbEndpoint && editingCobbEndpointMeasurement && (
        <div
          role="listbox"
          aria-label={`选择${
            editingCobbEndpoint.field === 'upperVertebra'
              ? '上端椎'
              : '下端椎'
          }`}
          className="fixed z-[70] max-h-56 overflow-y-auto rounded border border-blue-300/40 bg-gray-900 py-1 shadow-xl"
          style={{
            left: editingCobbEndpoint.anchor.left,
            top: editingCobbEndpoint.anchor.top,
            minWidth: editingCobbEndpoint.anchor.minWidth,
          }}
          onClick={event => event.stopPropagation()}
          data-canvas-wheel-blocker
        >
          {cobbEndpointOptions.map(option => {
            const isOppositeEndpointOption =
              editingCobbOppositeEndpointValue.length > 0 &&
              normalizeEndpointValue(option) === editingCobbOppositeEndpointValue;

            return (
              <button
                key={option}
                type="button"
                role="option"
                disabled={isOppositeEndpointOption}
                aria-disabled={isOppositeEndpointOption}
                aria-selected={option === editingCobbEndpointValue}
                title={
                  isOppositeEndpointOption
                    ? `该椎体已作为${editingCobbOppositeEndpointLabel}使用`
                    : undefined
                }
                onClick={event => {
                  event.stopPropagation();
                  if (isOppositeEndpointOption) return;
                  selectCobbEndpoint(
                    editingCobbEndpointMeasurement,
                    editingCobbEndpoint.field,
                    option
                  );
                }}
                className={`block w-full px-3 py-1.5 text-left font-mono text-xs ${
                  isOppositeEndpointOption
                    ? 'cursor-not-allowed text-white/30'
                    : option === editingCobbEndpointValue
                      ? 'bg-blue-500/30 text-blue-100 hover:bg-blue-500/25'
                      : 'text-white/85 hover:bg-blue-500/25'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
      <div className="w-full overflow-hidden rounded-lg bg-black/70 backdrop-blur-sm sm:w-[500px] sm:max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-3 py-2 bg-black/20 w-full">
          <div className="flex items-center min-w-0">
            <button
              onClick={event => {
                event.stopPropagation();
                onToggleAllAnnotations();
              }}
              className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 mr-1"
              title={hideAllAnnotations ? '显示所有标注' : '隐藏所有标注'}
            >
              <i
                className={`${hideAllAnnotations ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}
              ></i>
            </button>
            <button
              onClick={event => {
                event.stopPropagation();
                onToggleAllLabels();
              }}
              className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 mr-2"
              title={hideAllLabels ? '显示所有标识' : '隐藏所有标识'}
            >
              <i
                className={`${hideAllLabels ? 'ri-format-clear' : 'ri-text'} text-sm`}
              ></i>
            </button>
            <span className="text-white text-xs font-medium whitespace-nowrap">
              标注列表
            </span>
          </div>
          <button
            onClick={onToggleResults}
            className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2"
          >
            <i
              className={`${showResults ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}
            ></i>
          </button>
        </div>

        {showResults && (
          <>
            <div className="grid grid-cols-2 gap-1 px-2 py-2 bg-black/10">
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  setActiveTab('measurements');
                }}
                className={`h-7 rounded text-xs ${
                  activeTab === 'measurements'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                测量项
              </button>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  setActiveTab('keypoints');
                }}
                className={`h-7 rounded text-xs ${
                  activeTab === 'keypoints'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                检测点
              </button>
            </div>
            <div
              data-testid="measurement-results-scroll-content"
              className="max-h-[50vh] overflow-y-auto"
              onWheel={event => event.stopPropagation()}
            >

            {activeTab === 'measurements' &&
              ((standardDistance !== null &&
                standardDistancePoints.length === 2) ||
              measurements.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {standardDistance !== null &&
                    standardDistancePoints.length === 2 && (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40">
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onToggleStandardDistanceVisibility();
                          }}
                          className="text-purple-400/60 hover:text-purple-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={
                            isStandardDistanceHidden ? '显示标注' : '隐藏标注'
                          }
                        >
                          <i
                            className={`${isStandardDistanceHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        <div className="w-4 h-4 flex-shrink-0"></div>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate mr-2 font-medium text-purple-300">
                            标准距离
                          </span>
                          <span className="font-mono whitespace-nowrap text-purple-200">
                            {standardDistance}mm
                          </span>
                        </div>
                        <div className="w-4 h-4 flex-shrink-0"></div>
                      </div>
                    )}

                  {sortedMeasurements.map(measurement => {
                    const isSelected =
                      selectionState.measurementId === measurement.id;
                    const isHovered =
                      !isSelected &&
                      hoverState.measurementId === measurement.id;
                    const isLabelHidden = hiddenMeasurementIds.has(
                      measurement.id
                    );
                    const isAnnotationHidden = hiddenAnnotationIds.has(
                      measurement.id
                    );
                    const isEditableAuxiliary =
                      isEditableAuxiliaryAnnotationType(measurement.type);
                    const displayName = getMeasurementDisplayName(measurement);
                    const isEditingThisAuxName =
                      editingAuxiliaryName === measurement.id;

                    return (
                      <div
                        key={measurement.id}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                          isSelected
                            ? 'bg-white/20 border border-white/50'
                            : isHovered
                              ? 'bg-yellow-500/20 border border-yellow-500/40'
                              : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onToggleMeasurementAnnotation(measurement.id);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isAnnotationHidden ? '显示标注' : '隐藏标注'}
                        >
                          <i
                            className={`${isAnnotationHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onToggleMeasurementLabel(measurement.id);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isLabelHidden ? '显示标识' : '隐藏标识'}
                        >
                          <i
                            className={`${isLabelHidden ? 'ri-format-clear' : 'ri-text'} text-xs`}
                          ></i>
                        </button>

                        <div
                          className="flex min-w-0 flex-1 cursor-pointer items-center"
                          onMouseEnter={event => {
                            event.stopPropagation();
                            onMeasurementHover(measurement.id);
                          }}
                          onMouseLeave={event => {
                            event.stopPropagation();
                            onMeasurementHover(null);
                          }}
                          onClick={event => {
                            event.stopPropagation();
                            onMeasurementSelect(measurement.id);
                          }}
                          title={
                            measurement.upperVertebra &&
                            measurement.lowerVertebra &&
                            measurement.apexVertebra
                              ? `上端椎: ${measurement.upperVertebra} | 下端椎: ${measurement.lowerVertebra} | 顶椎: ${measurement.apexVertebra}`
                              : undefined
                          }
                        >
                          {renderMeasurementName(
                            measurement,
                            displayName,
                            isSelected,
                            isHovered,
                            isEditableAuxiliary,
                            isEditingThisAuxName
                          )}
                          <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                            {renderCobbSyncButton(measurement)}
                            <span
                              className={`font-mono whitespace-nowrap ${
                                isSelected
                                  ? 'text-white'
                                  : isHovered
                                    ? measurement.value.startsWith('-')
                                      ? 'text-blue-300'
                                      : 'text-yellow-200'
                                    : measurement.value.startsWith('-')
                                      ? 'text-blue-400'
                                      : 'text-yellow-400'
                              }`}
                            >
                              {measurement.value}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onMeasurementDelete(measurement.id);
                          }}
                          className="text-red-400/60 hover:text-red-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title="删除标注"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <i className="ri-ruler-line w-4 h-4 flex items-center justify-center mx-auto mb-1 text-white/60"></i>
                  <p className="text-xs text-white/60">暂无测量数据</p>
                </div>
              ))}

            {activeTab === 'keypoints' &&
              (keypoints.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {sortedKeypoints.map(keypoint => {
                    const isHidden = hiddenKeypointIds.has(keypoint.id);
                    const isHovered = hoverState.keypointId === keypoint.id;
                    return (
                      <div
                        key={keypoint.id}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                          isHovered
                            ? 'bg-yellow-500/20 border border-yellow-500/40'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                        onMouseEnter={event => {
                          event.stopPropagation();
                          onKeypointHover(keypoint.id);
                        }}
                        onMouseLeave={event => {
                          event.stopPropagation();
                          onKeypointHover(null);
                        }}
                      >
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onToggleKeypointVisibility(keypoint.id);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isHidden ? '显示检测点' : '隐藏检测点'}
                        >
                          <i
                            className={`${isHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span
                            className={`truncate mr-2 font-medium ${
                              isHovered ? 'text-yellow-300' : 'text-white/90'
                            }`}
                          >
                            {keypoint.id}
                          </span>
                          <span
                            className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] ${
                              keypoint.source === AnnotationSource.AI
                                ? 'bg-blue-500/20 text-blue-200'
                                : 'bg-emerald-500/20 text-emerald-200'
                            }`}
                          >
                            {keypoint.source === AnnotationSource.AI
                              ? 'AI自动检测'
                              : '手动标注'}
                          </span>
                        </div>
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onKeypointDelete(keypoint.id);
                          }}
                          className="text-red-400/60 hover:text-red-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title="删除检测点"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <i className="ri-focus-3-line w-4 h-4 flex items-center justify-center mx-auto mb-1 text-white/60"></i>
                  <p className="text-xs text-white/60">暂无检测点</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
