import type { JSX } from 'react';
import {
  getBindingIndicatorColor,
  getSyncGroupsForPoint,
  AnnotationBindings,
  PointRef,
} from '../../../domain/annotation-binding';
import {
  getAnnotationDisplayName,
  getAnnotationTypeId,
} from '../../../catalog/shared/annotation-config';
import {
  getColorForType,
  getAuxiliaryMeasurementValueTagName,
  getAuxiliaryTagText,
  hasCustomAuxiliaryTagText,
  isEditableAuxiliaryAnnotationType,
  getLabelPositionForType,
  renderSpecialSVGElements,
  usesAuxiliaryMeasurementValueTag,
  usesInlineAuxiliaryTag,
  calculateSmartLabelPosition,
  isRightSideLabelType,
  isMaxXRightLabelType,
  isFixedLabelPositionType,
} from '../../../domain/annotation-metadata';
import { isAuxiliaryShape as checkIsAuxiliaryShape } from '../../../canvas/tools/tool-state';
import { imageToScreen } from '../../../canvas/transform/coordinate-transform';
import { TEXT_LABEL_CONSTANTS, getAdaptiveFontSize } from '../../../shared/constants';
import { estimateTextHeight, estimateTextWidth } from '../../../shared/labels';
import { MeasurementData, Point } from '../../../types';
import { HoverState, SelectionState } from '../types';
import { renderAuxiliaryTag } from './support-shape-renderers/auxiliaryTagRenderer';
import { formatDisplayValue } from './shared/rendererUtils';

interface RenderMeasurementProps {
  measurement: MeasurementData;
  imageScale: number;
  imagePosition: { x: number; y: number };
  imageNaturalSize: { width: number; height: number } | null;
  selectionState: SelectionState;
  hoverState: HoverState;
  hideAllLabels: boolean;
  hiddenMeasurementIds: Set<string>;
  pointBindings: AnnotationBindings;
  selectedBindingGroupId: string | null;
  isManualBindingMode: boolean;
  manualBindingSelectedPoints: PointRef[];
  allMeasurements?: MeasurementData[];
  measurementIndex?: number;
}

function getPointColor(
  isSelected: boolean,
  isHovered: boolean,
  fallbackColor: string
) {
  if (isSelected) return '#ef4444';
  if (isHovered) return '#fbbf24';
  return fallbackColor;
}

function renderIndexedPoint({
  measurement,
  point,
  pointIndex,
  pointColor,
  selectionState,
  hoverState,
  pointBindings,
  selectedBindingGroupId,
  isManualBindingMode,
  manualBindingSelectedPoints,
}: {
  measurement: MeasurementData;
  point: Point;
  pointIndex: number;
  pointColor: string;
  selectionState: SelectionState;
  hoverState: HoverState;
  pointBindings: AnnotationBindings;
  selectedBindingGroupId: string | null;
  isManualBindingMode: boolean;
  manualBindingSelectedPoints: PointRef[];
}) {
  const isSelected =
    selectionState.measurementId === measurement.id &&
    ((selectionState.type === 'point' &&
      selectionState.pointIndex === pointIndex) ||
      selectionState.type === 'whole');
  const isHovered =
    !isSelected &&
    hoverState.measurementId === measurement.id &&
    ((hoverState.elementType === 'point' &&
      hoverState.pointIndex === pointIndex) ||
      hoverState.elementType === 'whole');
  const bindingColor = getBindingIndicatorColor(
    measurement.id,
    pointIndex,
    pointBindings
  );
  const isInSelectedGroup =
    selectedBindingGroupId !== null &&
    getSyncGroupsForPoint(
      measurement.id,
      pointIndex,
      pointBindings
    ).some(group => group.id === selectedBindingGroupId);
  const isManualSelected =
    isManualBindingMode &&
    manualBindingSelectedPoints.some(
      pointRef =>
        pointRef.annotationId === measurement.id &&
        pointRef.pointIndex === pointIndex
    );
  const displayColor = getPointColor(isSelected, isHovered, pointColor);

  return (
    <g key={`${measurement.id}-point-${pointIndex}`}>
      {bindingColor && !isSelected && !isHovered && (
        <circle
          cx={point.x}
          cy={point.y}
          r={isInSelectedGroup ? '10' : '7'}
          fill={isInSelectedGroup ? '#ef444433' : 'none'}
          stroke={isInSelectedGroup ? '#ef4444' : bindingColor}
          strokeWidth={isInSelectedGroup ? '2.5' : '2'}
          opacity={isInSelectedGroup ? '1' : '0.85'}
          strokeDasharray={isInSelectedGroup ? undefined : '3,2'}
        />
      )}
      {isManualSelected && (
        <circle
          cx={point.x}
          cy={point.y}
          r="11"
          fill="#22d3ee33"
          stroke="#22d3ee"
          strokeWidth="2.5"
          opacity="1"
        />
      )}
      {isManualBindingMode && !isManualSelected && (
        <circle
          cx={point.x}
          cy={point.y}
          r="9"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1"
          opacity="0.35"
          strokeDasharray="2,2"
        />
      )}
      <circle
        cx={point.x}
        cy={point.y}
        r={isSelected ? '5' : isHovered ? '6' : '3'}
        fill={displayColor}
        stroke={isSelected || isHovered ? displayColor : '#ffffff'}
        strokeWidth={isSelected ? '2' : isHovered ? '3' : '1'}
        opacity={isSelected || isHovered ? '1' : '0.8'}
      />
      {isSelected && (
        <circle
          cx={point.x}
          cy={point.y}
          r="8"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          opacity="0.6"
        />
      )}
      {isHovered && (
        <circle
          cx={point.x}
          cy={point.y}
          r="9"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          opacity="0.6"
        />
      )}
      <text
        x={point.x + 8}
        y={point.y - 8}
        fill={displayColor}
        fontSize={isSelected || isHovered ? '14' : '12'}
        fontWeight="bold"
        stroke="#000000"
        strokeWidth="0.5"
        paintOrder="stroke"
      >
        {measurement.type.startsWith('AI检测-') && measurement.points.length === 1
          ? measurement.value
          : pointIndex + 1}
      </text>
    </g>
  );
}

function renderAuxiliaryShape(
  measurement: MeasurementData,
  screenPoints: Point[],
  displayColor: string,
  isMeasurementSelected: boolean,
  isMeasurementHovered: boolean
) {
  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'circle' && screenPoints.length >= 2) {
    const radius = Math.hypot(
      screenPoints[1].x - screenPoints[0].x,
      screenPoints[1].y - screenPoints[0].y
    );
    return (
      <circle
        cx={screenPoints[0].x}
        cy={screenPoints[0].y}
        r={radius}
        fill={isMeasurementSelected || isMeasurementHovered ? displayColor : 'none'}
        fillOpacity={isMeasurementSelected || isMeasurementHovered ? '0.1' : '0'}
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.6'}
      />
    );
  }

  if (typeId === 'ellipse' && screenPoints.length >= 2) {
    return (
      <ellipse
        cx={screenPoints[0].x}
        cy={screenPoints[0].y}
        rx={Math.abs(screenPoints[1].x - screenPoints[0].x)}
        ry={Math.abs(screenPoints[1].y - screenPoints[0].y)}
        fill={isMeasurementSelected || isMeasurementHovered ? displayColor : 'none'}
        fillOpacity={isMeasurementSelected || isMeasurementHovered ? '0.1' : '0'}
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.6'}
      />
    );
  }

  if (typeId === 'rectangle' && screenPoints.length >= 2) {
    const minX = Math.min(screenPoints[0].x, screenPoints[1].x);
    const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
    return (
      <rect
        x={minX}
        y={minY}
        width={Math.abs(screenPoints[1].x - screenPoints[0].x)}
        height={Math.abs(screenPoints[1].y - screenPoints[0].y)}
        fill={isMeasurementSelected || isMeasurementHovered ? displayColor : 'none'}
        fillOpacity={isMeasurementSelected || isMeasurementHovered ? '0.1' : '0'}
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.6'}
      />
    );
  }

  if (typeId === 'arrow' && screenPoints.length >= 2) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
        markerEnd={
          isMeasurementSelected
            ? 'url(#arrowhead-selected)'
            : isMeasurementHovered
              ? 'url(#arrowhead-hovered)'
              : 'url(#arrowhead-normal)'
        }
      />
    );
  }

  if (typeId === 'polygon' && screenPoints.length >= 3) {
    return (
      <polygon
        points={screenPoints.map(point => `${point.x},${point.y}`).join(' ')}
        fill="none"
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.6'}
      />
    );
  }

  if (typeId === 'vertebra-center' && screenPoints.length === 4) {
    const centerScreen = {
      x: (screenPoints[0].x + screenPoints[1].x + screenPoints[2].x + screenPoints[3].x) / 4,
      y: (screenPoints[0].y + screenPoints[1].y + screenPoints[2].y + screenPoints[3].y) / 4,
    };

    return (
      <g>
        <polygon
          points={screenPoints.map(point => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={displayColor}
          strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
          opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.6'}
        />
        <circle
          cx={centerScreen.x}
          cy={centerScreen.y}
          r="8"
          fill="none"
          stroke={displayColor}
          strokeWidth="2"
          opacity="0.9"
        />
        <circle
          cx={centerScreen.x}
          cy={centerScreen.y}
          r="3"
          fill={displayColor}
          opacity="0.9"
        />
        <line
          x1={centerScreen.x - 12}
          y1={centerScreen.y}
          x2={centerScreen.x + 12}
          y2={centerScreen.y}
          stroke={displayColor}
          strokeWidth="2"
          opacity="0.9"
        />
        <line
          x1={centerScreen.x}
          y1={centerScreen.y - 12}
          x2={centerScreen.x}
          y2={centerScreen.y + 12}
          stroke={displayColor}
          strokeWidth="2"
          opacity="0.9"
        />
        <text
          x={centerScreen.x}
          y={centerScreen.y - 18}
          fill={displayColor}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          opacity="0.9"
        >
          中心
        </text>
      </g>
    );
  }

  if (typeId === 'aux-length' && screenPoints.length === 2) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
      />
    );
  }

  if (typeId === 'aux-angle' && screenPoints.length === 3) {
    return (
      <>
        <line
          x1={screenPoints[0].x}
          y1={screenPoints[0].y}
          x2={screenPoints[1].x}
          y2={screenPoints[1].y}
          stroke={displayColor}
          strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
          opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
        />
        <line
          x1={screenPoints[1].x}
          y1={screenPoints[1].y}
          x2={screenPoints[2].x}
          y2={screenPoints[2].y}
          stroke={displayColor}
          strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
          opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
        />
      </>
    );
  }

  if (
    (typeId === 'aux-horizontal-line' ||
      typeId === 'aux-vertical-line') &&
    screenPoints.length === 2
  ) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth={isMeasurementSelected || isMeasurementHovered ? '3' : '2'}
        opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
      />
    );
  }

  return null;
}

/**
 * 正式标注 renderer 总入口。
 * 入口组件只传状态和 measurement，按类型分发由这里统一负责。
 */
export default function renderMeasurement({
  measurement,
  imageScale,
  imagePosition,
  imageNaturalSize,
  selectionState,
  hoverState,
  hideAllLabels,
  hiddenMeasurementIds,
  pointBindings,
  selectedBindingGroupId,
  isManualBindingMode,
  manualBindingSelectedPoints,
  allMeasurements = [],
  measurementIndex = 0,
}: RenderMeasurementProps): JSX.Element {
  const context = {
    imageNaturalSize,
    imagePosition,
    imageScale,
  };
  const screenPoints = measurement.points.map(point => imageToScreen(point, context));
  const displayName = getAnnotationDisplayName(measurement.type);
  const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);
  const usesAuxiliaryValueTag = usesAuxiliaryMeasurementValueTag(
    measurement.type
  );
  const hasCustomAuxiliaryTag =
    isEditableAuxiliaryAnnotationType(measurement.type) &&
    hasCustomAuxiliaryTagText(measurement);
  const isMeasurementSelected =
    selectionState.measurementId === measurement.id &&
    selectionState.type === 'whole';
  const isMeasurementHovered =
    !isMeasurementSelected &&
    hoverState.measurementId === measurement.id &&
    hoverState.elementType === 'whole';
  const baseColor = getColorForType(measurement.type);
  const displayColor = getPointColor(
    isMeasurementSelected,
    isMeasurementHovered,
    baseColor
  );

  const specialShapeNode = renderAuxiliaryShape(
    measurement,
    screenPoints,
    displayColor,
    isMeasurementSelected,
    isMeasurementHovered
  );

  // 获取基础标签位置
  const baseLabelPosition = getLabelPositionForType(measurement.type, measurement.points, imageScale);

  // 固定标签位置的类型（PI、PT等骨盆测量）跳过智能避让，直接使用 getLabelPosition 结果
  const isFixedLabel = isFixedLabelPositionType(measurement.type);

  // 计算已占用的标签位置（只考虑当前标注之前的标注）
  const occupiedPositions = allMeasurements
    .slice(0, measurementIndex)
    .filter(m => !hiddenMeasurementIds.has(m.id))
    .map(m => getLabelPositionForType(m.type, m.points, imageScale));

  // 使用智能位置计算避免重叠（固定标签跳过）
  const smartLabelPosition = isFixedLabel
    ? baseLabelPosition
    : calculateSmartLabelPosition(
        baseLabelPosition,
        occupiedPositions,
        imageScale,
        'right' // 默认优先右侧
      );

  const labelPosition = imageToScreen(smartLabelPosition, context);

  // 使用格式化后的值用于图表显示
  const displayValue = formatDisplayValue(measurement.value);
  const valueTagName = usesAuxiliaryValueTag
    ? getAuxiliaryMeasurementValueTagName(measurement)
    : displayName;
  const textContent = `${valueTagName}: ${displayValue}`;
  // 自适应字体大小：随缩放级别动态调整，有上下限
  const fontSize = getAdaptiveFontSize(imageScale, isMeasurementHovered);
  const padding = TEXT_LABEL_CONSTANTS.PADDING;
  const textWidth = estimateTextWidth(textContent, fontSize, 0);
  const textHeight = estimateTextHeight(fontSize, 0);

  // 右侧标签：在屏幕坐标系中直接定位，完全绕开图像坐标偏移的 fitScale 损耗。
  // fitScale = displayWidth/naturalWidth，导致图像坐标偏移转换到屏幕后远小于预期。
  const isRightSideLabel = isRightSideLabelType(measurement.type);
  const isMaxXRightLabel = isMaxXRightLabelType(measurement.type);
  // rightSideLabel（侧面）：文字左缘从第1个点右侧 20px 开始，textAnchor="start"
  const firstPointScreenX = screenPoints.length > 0 ? screenPoints[0].x : labelPosition.x;
  // maxXRightLabel（正面 AP）：文字左缘从所有点最大 X 右侧 gap=6px 开始，textAnchor="middle"
  // 用实际 textWidth 计算文字中心：center = maxScreenX + gap + textWidth/2
  const maxScreenPointX = screenPoints.length > 0
    ? Math.max(...screenPoints.map(p => p.x))
    : labelPosition.x;
  const AP_LABEL_GAP = 6; // 文字左缘距测量右侧的间距（屏幕像素）
  const textLabelX = isRightSideLabel
    ? firstPointScreenX + 20
    : isMaxXRightLabel
      ? maxScreenPointX + AP_LABEL_GAP + textWidth / 2
      : labelPosition.x;
  const textLabelAnchor = isRightSideLabel ? 'start' : 'middle';

  return (
    <g key={measurement.id}>
      {(!isAuxiliaryShape ||
        usesAuxiliaryValueTag ||
        specialShapeNode) &&
        screenPoints.map((point, pointIndex) =>
          renderIndexedPoint({
            measurement,
            point,
            pointIndex,
            pointColor: displayColor,
            selectionState,
            hoverState,
            pointBindings,
            selectedBindingGroupId,
            isManualBindingMode,
            manualBindingSelectedPoints,
          })
        )}

      {specialShapeNode ??
        renderSpecialSVGElements(
          measurement.type,
          screenPoints,
          displayColor,
          imageScale
        )}

      {(!isAuxiliaryShape || usesAuxiliaryValueTag) &&
        screenPoints.length >= 2 &&
        !hideAllLabels &&
        !hiddenMeasurementIds.has(measurement.id) && (
          <text
            x={textLabelX}
            y={labelPosition.y + fontSize * 0.35}
            fill={displayColor}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor={textLabelAnchor}
            stroke="#000000"
            strokeWidth="1.5"
            paintOrder="stroke"
          >
            {valueTagName}: {displayValue}
          </text>
        )}

      {isAuxiliaryShape &&
        renderAuxiliaryTag({
          measurement,
          labelPosition,
          displayColor,
          fontSize,
          hideAllLabels,
          hiddenMeasurementIds,
        })}

      {hasCustomAuxiliaryTag &&
        !usesInlineAuxiliaryTag(measurement.type) &&
        !usesAuxiliaryValueTag &&
        !hideAllLabels &&
        !hiddenMeasurementIds.has(measurement.id) && (
          <text
            x={labelPosition.x}
            y={labelPosition.y + 5}
            fill={displayColor}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
            stroke="#000000"
            strokeWidth="1.5"
            paintOrder="stroke"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {getAuxiliaryTagText(measurement)}
          </text>
        )}
    </g>
  );
}
