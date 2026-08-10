import type { JSX } from 'react';
import {
  getBindingIndicatorColor,
  getSyncGroupsForPoint,
  AnnotationBindings,
  PointRef,
} from '@xiehe/imaging-core/bindings';
import {
  getAnnotationDisplayName,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getColorForType,
  getAuxiliaryMeasurementValueTagName,
  getAuxiliaryTagText,
  hasCustomAuxiliaryTagText,
  isEditableAuxiliaryAnnotationType,
  getLabelPositionForType,
  usesAuxiliaryMeasurementValueTag,
  usesInlineAuxiliaryTag,
  calculateSmartLabelPosition,
  isRightSideLabelType,
  isMaxXRightLabelType,
  isFixedLabelPositionType,
  getInteractivePointsCount,
  getApLabelGapX,
  shouldPreserveCanvasValue,
  shouldShowPointLabels,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-metadata';
import { getAvtLabelPosition } from '@xiehe/imaging-core/measurements/ap';
import { renderAvtMeasurement } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers';
import { renderVertebraCenterGeometry } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers';
import { isAuxiliaryShape as checkIsAuxiliaryShape } from '@xiehe/imaging-core/canvas';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
import { getAdaptiveFontSize } from '@/app/imaging/features/image-viewer/shared/constants';
import { estimateTextWidth } from '@/app/imaging/features/image-viewer/shared/labels';
import {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';
import {
  HoverState,
  SelectionState,
} from '@xiehe/imaging-core/canvas';
import { renderAuxiliaryTag } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/support-shape-renderers/auxiliaryTagRenderer';
import { circleRenderer } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/support-shape-renderers/circleRenderer';
import { formatDisplayValue } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/shared/rendererUtils';
import { renderSpecialAnnotationElements } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/special-annotation-renderer-registry';
import { getBilateralPelvicGeometryOwnerId } from '@xiehe/imaging-core/canvas';
import { resolveVariableMeasurement } from '@xiehe/imaging-core/measurements';
import {
  getPelvicPointDisplayLabel,
  getPelvicSharedPointLabelKey as getResolvedPelvicSharedPointLabelKey,
  shouldShowPelvicPointDisplayLabel,
} from '@xiehe/imaging-core/measurements/lateral';

interface RenderMeasurementProps {
  measurement: MeasurementData;
  examType?: string;
  imageScale: number;
  imagePosition: { x: number; y: number };
  imageNaturalSize: { width: number; height: number } | null;
  standardDistance?: number | null;
  standardDistancePoints?: Point[];
  /** 可选：覆盖容器尺寸，绕开 DOM 查询（用于导出场景） */
  containerSize?: { width: number; height: number };
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

function getPointDisplayLabel(
  measurement: MeasurementData,
  pointIndex: number
): string | number {
  if (
    measurement.type.startsWith('AI检测-') &&
    measurement.points.length === 1
  ) {
    return measurement.value;
  }

  const pelvicLabel = getPelvicPointDisplayLabel(measurement, pointIndex);
  if (pelvicLabel !== null) return pelvicLabel;

  return pointIndex + 1;
}

function getPelvicSharedPointLabelKey(
  measurement: MeasurementData,
  pointIndex: number
): string | null {
  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'ss') {
    if (pointIndex === 0) return 'pelvic-s1-1';
    if (pointIndex === 1) return 'pelvic-s1-2';
  }

  return getResolvedPelvicSharedPointLabelKey(measurement, pointIndex);
}

function ownsSharedPointLabel(
  measurement: MeasurementData,
  pointIndex: number,
  allMeasurements: MeasurementData[],
  measurementIndex: number
): boolean {
  const labelKey = getPelvicSharedPointLabelKey(measurement, pointIndex);
  if (!labelKey) return true;

  return !allMeasurements
    .slice(0, measurementIndex)
    .some(previous =>
      previous.points.some(
        (_, previousPointIndex) =>
          getPelvicSharedPointLabelKey(previous, previousPointIndex) ===
          labelKey
      )
    );
}

function renderIndexedPoint({
  measurement,
  point,
  pointIndex,
  pointColor,
  showPointLabel,
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
  showPointLabel: boolean;
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
    getSyncGroupsForPoint(measurement.id, pointIndex, pointBindings).some(
      group => group.id === selectedBindingGroupId
    );
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
      {showPointLabel && (
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
          {getPointDisplayLabel(measurement, pointIndex)}
        </text>
      )}
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
    const isActive = isMeasurementSelected || isMeasurementHovered;
    return circleRenderer(screenPoints, displayColor, {
      fill: isActive ? displayColor : 'none',
      fillOpacity: isActive ? 0.1 : 0,
      strokeWidth: isActive ? 3 : 2,
      opacity: isActive ? 1 : 0.6,
    });
  }

  if (typeId === 'ellipse' && screenPoints.length >= 2) {
    return (
      <ellipse
        cx={screenPoints[0].x}
        cy={screenPoints[0].y}
        rx={Math.abs(screenPoints[1].x - screenPoints[0].x)}
        ry={Math.abs(screenPoints[1].y - screenPoints[0].y)}
        fill={
          isMeasurementSelected || isMeasurementHovered ? displayColor : 'none'
        }
        fillOpacity={
          isMeasurementSelected || isMeasurementHovered ? '0.1' : '0'
        }
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
        fill={
          isMeasurementSelected || isMeasurementHovered ? displayColor : 'none'
        }
        fillOpacity={
          isMeasurementSelected || isMeasurementHovered ? '0.1' : '0'
        }
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
    return renderVertebraCenterGeometry({
      corners: [
        screenPoints[0],
        screenPoints[1],
        screenPoints[2],
        screenPoints[3],
      ],
      displayColor,
      strokeWidth: isMeasurementSelected || isMeasurementHovered ? 3 : 2,
      opacity: isMeasurementSelected || isMeasurementHovered ? 1 : 0.6,
    });
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
          strokeWidth={
            isMeasurementSelected || isMeasurementHovered ? '3' : '2'
          }
          opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
        />
        <line
          x1={screenPoints[1].x}
          y1={screenPoints[1].y}
          x2={screenPoints[2].x}
          y2={screenPoints[2].y}
          stroke={displayColor}
          strokeWidth={
            isMeasurementSelected || isMeasurementHovered ? '3' : '2'
          }
          opacity={isMeasurementSelected || isMeasurementHovered ? '1' : '0.8'}
        />
      </>
    );
  }

  if (
    (typeId === 'aux-horizontal-line' || typeId === 'aux-vertical-line') &&
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
  examType,
  imageScale,
  imagePosition,
  imageNaturalSize,
  standardDistance = null,
  standardDistancePoints = [],
  containerSize,
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
}: RenderMeasurementProps): JSX.Element | null {
  const variableResolution = examType
    ? resolveVariableMeasurement(measurement, { examType })
    : { status: 'not-applicable' as const };
  if (variableResolution.status === 'invalid') {
    return null;
  }
  const resolvedMeasurement =
    variableResolution.status === 'resolved'
      ? variableResolution.value
      : undefined;
  const context = {
    imageNaturalSize,
    imagePosition,
    imageScale,
    containerSize: containerSize ?? null,
  };
  const projectImagePoint = (point: Point) => imageToScreen(point, context);
  const screenPoints = measurement.points.map(point =>
    imageToScreen(point, context)
  );
  const pelvicGeometryOwnerId = getBilateralPelvicGeometryOwnerId(
    allMeasurements.length > 0 ? allMeasurements : [measurement],
    item => hiddenMeasurementIds.has(item.id)
  );
  const renderPelvicSharedGeometry =
    measurement.id === pelvicGeometryOwnerId &&
    !hiddenMeasurementIds.has(measurement.id);
  const effectiveCfhInteractionState: 'idle' | 'hovered' | 'selected' =
    selectionState.measurementId === measurement.id &&
    selectionState.type === 'effective-cfh'
      ? 'selected'
      : hoverState.measurementId === measurement.id &&
          hoverState.elementType === 'effective-cfh'
        ? 'hovered'
        : 'idle';
  const specialElementContext = {
    imagePoints: measurement.points,
    screenPoints,
    imageToScreen: projectImagePoint,
    calculationContext: {
      standardDistance,
      standardDistancePoints,
      imageNaturalSize,
    },
    renderPelvicSharedGeometry,
    effectiveCfhInteractionState,
    resolvedMeasurement,
  };
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
    (selectionState.type === 'line' || selectionState.type === 'whole');
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

  const auxiliaryShapeNode = renderAuxiliaryShape(
    measurement,
    screenPoints,
    displayColor,
    isMeasurementSelected,
    isMeasurementHovered
  );
  const avtShapeNode =
    resolvedMeasurement?.kind === 'avt'
      ? renderAvtMeasurement({
          measurement,
          displayColor,
          imageToScreen: projectImagePoint,
        })
      : null;
  const specialShapeNode = auxiliaryShapeNode ?? avtShapeNode;

  // 获取基础标签位置
  const baseLabelPosition =
    resolvedMeasurement?.kind === 'avt'
      ? getAvtLabelPosition(measurement)
      : getLabelPositionForType(
          measurement.type,
          measurement.points,
          imageScale
        );

  // 固定标签位置的类型（PI、PT等骨盆测量）跳过智能避让，直接使用 getLabelPosition 结果
  const isFixedLabel = isFixedLabelPositionType(measurement.type);

  // 计算已占用的标签位置（只考虑当前标注之前的标注）
  const occupiedPositions = allMeasurements
    .slice(0, measurementIndex)
    .filter(m => !hiddenMeasurementIds.has(m.id))
    .map(m =>
      getAnnotationTypeId(m.type) === 'avt'
        ? getAvtLabelPosition(m)
        : getLabelPositionForType(m.type, m.points, imageScale)
    );

  // 使用智能位置计算避免重叠（固定标签跳过）
  const smartLabelPosition = isFixedLabel
    ? baseLabelPosition
    : calculateSmartLabelPosition(
        baseLabelPosition,
        occupiedPositions,
        imageScale
      );

  const labelPosition = imageToScreen(smartLabelPosition, context);

  // 使用格式化后的值用于图表显示
  const displayValue = shouldPreserveCanvasValue(measurement.type)
    ? measurement.value
    : formatDisplayValue(measurement.value);
  const valueTagName = usesAuxiliaryValueTag
    ? getAuxiliaryMeasurementValueTagName(measurement)
    : displayName;
  const textContent = `${valueTagName}: ${displayValue}`;
  // 自适应字体大小：随缩放级别动态调整，有上下限
  const fontSize = getAdaptiveFontSize(imageScale, isMeasurementHovered);
  const textWidth = estimateTextWidth(textContent, fontSize, 0);

  // 右侧标签：在屏幕坐标系中直接定位，完全绕开图像坐标偏移的 fitScale 损耗。
  // fitScale = displayWidth/naturalWidth，导致图像坐标偏移转换到屏幕后远小于预期。
  const isRightSideLabel = isRightSideLabelType(measurement.type);
  const isMaxXRightLabel = isMaxXRightLabelType(measurement.type);
  // rightSideLabel（侧面）：文字左缘从第1个点右侧 20px 开始，textAnchor="start"
  const firstPointScreenX =
    screenPoints.length > 0 ? screenPoints[0].x : labelPosition.x;
  // maxXRightLabel（正面 AP）：锚点 = imageToScreen(getLabelPosition.x)（已在屏幕空间）。
  // getLabelPosition 只返回测量右端点的图像坐标，不加任何偏移，由此处统一加固定屏幕间距。
  // 效果：文字左缘始终在锚点右侧 AP_LABEL_GAP px，与缩放比例无关（类比侧面 rightSideLabel + 20px）。
  // 默认间距 8px；各测量可通过 AnnotationConfig.apLabelGapX 覆盖
  const AP_LABEL_GAP = isMaxXRightLabel ? getApLabelGapX(measurement.type) : 8;
  const textLabelX = isRightSideLabel
    ? firstPointScreenX + 20
    : isMaxXRightLabel
      ? labelPosition.x + AP_LABEL_GAP + textWidth / 2
      : labelPosition.x;
  const textLabelAnchor = isRightSideLabel ? 'start' : 'middle';

  // interactivePointsCount: 前 N 个点显示交互圆圈；undefined = 全部；0 = 全不显示
  const interactiveCount = getInteractivePointsCount(measurement.type);
  const interactivePoints =
    interactiveCount === undefined
      ? screenPoints
      : screenPoints.slice(0, interactiveCount);

  return (
    <g key={measurement.id}>
      {(!isAuxiliaryShape || usesAuxiliaryValueTag || specialShapeNode) &&
        interactivePoints.map((point, pointIndex) =>
          renderIndexedPoint({
            measurement,
            point,
            pointIndex,
            pointColor: displayColor,
            showPointLabel:
              shouldShowPointLabels(measurement.type) &&
              shouldShowPelvicPointDisplayLabel(measurement, pointIndex) &&
              ownsSharedPointLabel(
                measurement,
                pointIndex,
                allMeasurements,
                measurementIndex
              ),
            selectionState,
            hoverState,
            pointBindings,
            selectedBindingGroupId,
            isManualBindingMode,
            manualBindingSelectedPoints,
          })
        )}

      {specialShapeNode ??
        renderSpecialAnnotationElements(measurement.type, {
          screenPoints,
          displayColor,
          imageScale,
          context: specialElementContext,
        })}

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
