import { getDescriptionForType } from '../../../domain/annotation-metadata';
import { isAuxiliaryShape } from '../../../canvas/tools/tool-state';
import { Measurement } from '../../../types';
import { HoverState, SelectionState } from '../types';

interface MeasurementResultsPanelProps {
  showResults: boolean;
  hideAllLabels: boolean;
  hideAllAnnotations: boolean;
  isStandardDistanceHidden: boolean;
  standardDistance: number | null;
  standardDistancePoints: { x: number; y: number }[];
  measurements: Measurement[];
  selectionState: SelectionState;
  hoverState: HoverState;
  hiddenMeasurementIds: Set<string>;
  hiddenAnnotationIds: Set<string>;
  onToggleResults: () => void;
  onToggleAllAnnotations: () => void;
  onToggleAllLabels: () => void;
  onToggleStandardDistanceVisibility: () => void;
  onToggleMeasurementAnnotation: (measurementId: string) => void;
  onToggleMeasurementLabel: (measurementId: string) => void;
  onMeasurementHover: (measurementId: string | null) => void;
  onMeasurementSelect: (measurementId: string) => void;
  onMeasurementDelete: (measurementId: string) => void;
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
  selectionState,
  hoverState,
  hiddenMeasurementIds,
  hiddenAnnotationIds,
  onToggleResults,
  onToggleAllAnnotations,
  onToggleAllLabels,
  onToggleStandardDistanceVisibility,
  onToggleMeasurementAnnotation,
  onToggleMeasurementLabel,
  onMeasurementHover,
  onMeasurementSelect,
  onMeasurementDelete,
}: MeasurementResultsPanelProps) {
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
      <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden w-[240px]">
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
              测量结果
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
            {(standardDistance !== null &&
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

                {measurements.map(measurement => {
                  const isSelected =
                    selectionState.measurementId === measurement.id;
                  const isHovered =
                    !isSelected && hoverState.measurementId === measurement.id;
                  const isLabelHidden = hiddenMeasurementIds.has(measurement.id);
                  const isAnnotationHidden = hiddenAnnotationIds.has(
                    measurement.id
                  );

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
                        <span
                          className={`truncate mr-2 font-medium ${
                            isSelected
                              ? 'text-white'
                              : isHovered
                                ? 'text-yellow-300'
                                : 'text-white/90'
                          }`}
                        >
                          {isAuxiliaryShape(measurement.type) &&
                          measurement.description &&
                          measurement.description !==
                            getDescriptionForType(measurement.type)
                            ? measurement.description
                            : measurement.type}
                        </span>
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
                          {measurement.upperVertebra &&
                            measurement.lowerVertebra && (
                              <span className="text-white/60 text-xs ml-1">
                                ({measurement.upperVertebra}-
                                {measurement.lowerVertebra})
                              </span>
                            )}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
