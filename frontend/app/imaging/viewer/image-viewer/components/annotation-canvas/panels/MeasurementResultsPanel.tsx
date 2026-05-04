import { useEffect, useState } from 'react';
import {
  getAuxiliaryTagText,
  getDisplayName,
  hasCustomAuxiliaryTagText,
  isEditableAuxiliaryAnnotationType,
} from '../../../domain/annotation-metadata';
import { MeasurementData } from '../../../types';
import { KeypointAnnotation } from '../../../domain/keypoint-state';
import { HoverState, SelectionState } from '../types';

type ResultsTab = 'measurements' | 'keypoints';

interface MeasurementResultsPanelProps {
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
  onToggleKeypointVisibility: (keypointId: string) => void;
  onKeypointDelete: (keypointId: string) => void;
  onMeasurementUpdate?: (
    measurementId: string,
    updates: Partial<MeasurementData>
  ) => void;
}

/**
 * 左上角测量结果面板。
 * 面板交互与画布渲染弱耦合，单独抽离避免入口继续膨胀。
 */
export default function MeasurementResultsPanel({
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
  onToggleKeypointVisibility,
  onKeypointDelete,
  onMeasurementUpdate,
}: MeasurementResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('measurements');
  const [editingAuxiliaryName, setEditingAuxiliaryName] = useState<
    string | null
  >(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    setEditingAuxiliaryName(null);
  }, [measurements.length]);

  const startEditingAuxiliaryName = (
    measurementId: string,
    currentValue: string
  ) => {
    if (!onMeasurementUpdate) return;
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

  const getMeasurementDisplayName = (measurement: MeasurementData): string => {
    const isEditableAuxiliary = isEditableAuxiliaryAnnotationType(
      measurement.type
    );
    const baseDisplayName =
      isEditableAuxiliary && hasCustomAuxiliaryTagText(measurement)
        ? getAuxiliaryTagText(measurement)
        : getDisplayName(measurement.type);

    if (
      /^cobb/i.test(measurement.type) &&
      measurement.upperVertebra &&
      measurement.lowerVertebra
    ) {
      return `Cobb(${measurement.upperVertebra}-${measurement.lowerVertebra})`;
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

  const sortedMeasurements = [...measurements].sort((left, right) => {
    const byName = getMeasurementDisplayName(left).localeCompare(
      getMeasurementDisplayName(right)
    );
    return byName || left.id.localeCompare(right.id);
  });
  const sortedKeypoints = [...keypoints].sort((left, right) =>
    left.id.localeCompare(right.id)
  );

  return (
    <div
      className="absolute top-4 left-48 z-50"
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onMouseUp={event => event.stopPropagation()}
      onMouseMove={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
      onPointerMove={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
    >
      <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden w-[320px]">
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
          <div
            className="max-h-[50vh] overflow-y-auto"
            onWheel={event => event.stopPropagation()}
          >
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

            {activeTab === 'measurements' &&
              (((standardDistance !== null &&
                standardDistancePoints.length === 2) ||
                measurements.length > 0) ? (
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
                    !isSelected && hoverState.measurementId === measurement.id;
                  const isLabelHidden = hiddenMeasurementIds.has(measurement.id);
                  const isAnnotationHidden = hiddenAnnotationIds.has(
                    measurement.id
                  );
                  const isEditableAuxiliary = isEditableAuxiliaryAnnotationType(
                    measurement.type
                  );
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
                        className="flex-1 flex items-center justify-between cursor-pointer min-w-0"
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
                        {isEditingThisAuxName ? (
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={event =>
                              setEditingValue(event.target.value)
                            }
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
                        ) : isEditableAuxiliary && onMeasurementUpdate ? (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              startEditingAuxiliaryName(
                                measurement.id,
                                displayName
                              );
                            }}
                            title="点击编辑文字"
                            className={`truncate mr-2 font-medium text-left hover:text-yellow-300 hover:underline underline-offset-2 ${
                              isSelected
                                ? 'text-white'
                                : isHovered
                                  ? 'text-yellow-300'
                                  : 'text-white/90'
                            }`}
                          >
                            {displayName}
                          </button>
                        ) : (
                          <span
                            className={`truncate mr-2 font-medium ${
                              isSelected
                                ? 'text-white'
                                : isHovered
                                  ? 'text-yellow-300'
                                  : 'text-white/90'
                            }`}
                          >
                            {displayName}
                          </span>
                        )}
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
                    return (
                      <div
                        key={keypoint.id}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/5 border border-transparent"
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
                          <span className="truncate mr-2 font-medium text-white/90">
                            {keypoint.id}
                          </span>
                          <span
                            className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] ${
                              keypoint.source === 'ai'
                                ? 'bg-blue-500/20 text-blue-200'
                                : 'bg-emerald-500/20 text-emerald-200'
                            }`}
                          >
                            {keypoint.source === 'ai'
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
        )}
      </div>
    </div>
  );
}
