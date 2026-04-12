import {
  getBindingIndicatorColor,
  getSyncGroupsForPoint,
  AnnotationBindings,
  PointRef,
} from '../../../domain/annotation-binding';
import {
  getColorForType,
  getDescriptionForType,
  getLabelPositionForType,
  renderSpecialSVGElements,
} from '../../../domain/annotation-metadata';
import { isAuxiliaryShape as checkIsAuxiliaryShape } from '../../../canvas/tools/tool-state';
import { imageToScreen } from '../../../canvas/transform/coordinate-transform';
import { TEXT_LABEL_CONSTANTS } from '../../../shared/constants';
import { estimateTextHeight, estimateTextWidth } from '../../../shared/labels';
import { Measurement, Point } from '../../../types';
import { HoverState, SelectionState } from '../types';

interface RenderMeasurementProps {
  measurement: Measurement;
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
  measurement: Measurement;
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
  measurement: Measurement,
  screenPoints: Point[],
  displayColor: string,
  isMeasurementSelected: boolean,
  isMeasurementHovered: boolean
) {
  if (measurement.type === '圆形标注' && screenPoints.length >= 2) {
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

  if (measurement.type === '椭圆标注' && screenPoints.length >= 2) {
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

  if (measurement.type === '矩形标注' && screenPoints.length >= 2) {
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

  if (measurement.type === '箭头标注' && screenPoints.length >= 2) {
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

  if (measurement.type === '多边形标注' && screenPoints.length >= 3) {
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

  if (measurement.type === '锥体中心' && screenPoints.length === 4) {
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

  if (measurement.type === '距离标注' && screenPoints.length === 2) {
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

  if (measurement.type === '角度标注' && screenPoints.length === 3) {
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
    (measurement.type === '辅助水平线' ||
      measurement.type === '辅助垂直线') &&
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
}: RenderMeasurementProps) {
  const context = {
    imageNaturalSize,
    imagePosition,
    imageScale,
  };
  const screenPoints = measurement.points.map(point => imageToScreen(point, context));
  const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);
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
  const labelPosition = imageToScreen(
    getLabelPositionForType(measurement.type, measurement.points, imageScale),
    context
  );
  const textContent = `${measurement.type}: ${measurement.value}`;
  const fontSize = isMeasurementHovered
    ? TEXT_LABEL_CONSTANTS.HOVER_FONT_SIZE
    : TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE;
  const padding = TEXT_LABEL_CONSTANTS.PADDING;
  const textWidth = estimateTextWidth(textContent, fontSize, 0);
  const textHeight = estimateTextHeight(fontSize, 0);

  return (
    <g key={measurement.id}>
      {( !isAuxiliaryShape ||
        measurement.type === '辅助水平线' ||
        measurement.type === '辅助垂直线' ||
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

      {(!isAuxiliaryShape ||
        measurement.type === '辅助水平线' ||
        measurement.type === '辅助垂直线') &&
        screenPoints.length >= 2 &&
        !hideAllLabels &&
        !hiddenMeasurementIds.has(measurement.id) && (
          <g>
            <rect
              x={labelPosition.x - textWidth / 2 - padding}
              y={labelPosition.y - textHeight / 2 - padding}
              width={textWidth + padding * 2}
              height={textHeight + padding * 2}
              fill="white"
              opacity="0.9"
              rx="3"
            />
            <text
              x={labelPosition.x}
              y={labelPosition.y + fontSize * 0.35}
              fill={displayColor}
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="middle"
            >
              {measurement.type}: {measurement.value}
            </text>
          </g>
        )}

      {isAuxiliaryShape &&
        measurement.description &&
        measurement.description !== getDescriptionForType(measurement.type) && (
          <text
            x={labelPosition.x}
            y={labelPosition.y + 5}
            fill={displayColor}
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {measurement.description}
          </text>
        )}
    </g>
  );
}
