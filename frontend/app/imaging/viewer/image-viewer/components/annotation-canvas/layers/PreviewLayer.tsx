import { getAnnotationConfig } from '../../../catalog/annotation-catalog';
import { calculateQuadrilateralCenter } from '../../../shared/geometry';
import { Measurement, Point } from '../../../types';
import renderPreview from '../renderers/renderPreview';
import { DrawingState, ReferenceLines } from '../types';

interface PreviewLayerProps {
  selectedTool: string;
  currentTool: { id: string; name: string; pointsNeeded: number } | null;
  clickedPoints: Point[];
  measurements: Measurement[];
  referenceLines: ReferenceLines;
  standardDistance: number | null;
  standardDistancePoints: Point[];
  hoveredStandardPointIndex: number | null;
  draggingStandardPointIndex: number | null;
  isStandardDistanceHidden: boolean;
  imageScale: number;
  imageNaturalSize: { width: number; height: number } | null;
  liveMouseImagePoint: Point | null;
  drawingState: DrawingState;
  imageToScreen: (point: Point) => Point;
  constrainAuxLinePoint: (
    toolId: string,
    firstPoint: Point,
    rawPoint: Point
  ) => Point;
  workingPointHoverIndex: number | null;
  getInheritedPoints: (
    toolId: string,
    measurements: { type: string; points: Point[] }[]
  ) => { points: Point[]; count: number };
}

function ReferenceLinePreview({
  point,
  imageScale,
  imageToScreen,
  direction,
  label,
  lineLength,
}: {
  point: Point;
  imageScale: number;
  imageToScreen: (point: Point) => Point;
  direction: 'horizontal' | 'vertical';
  label: string;
  lineLength?: number;
}) {
  const referencePoint = imageToScreen(point);
  const previewLength =
    lineLength ??
    (direction === 'vertical' ? 100 * imageScale : 200 * imageScale);

  return (
    <g>
      {direction === 'horizontal' ? (
        <line
          x1={referencePoint.x - previewLength / 2}
          y1={referencePoint.y}
          x2={referencePoint.x + previewLength / 2}
          y2={referencePoint.y}
          stroke="#00ff00"
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.8"
        />
      ) : (
        <line
          x1={referencePoint.x}
          y1={referencePoint.y - previewLength / 2}
          x2={referencePoint.x}
          y2={referencePoint.y + previewLength / 2}
          stroke="#00ff00"
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.8"
        />
      )}
      <rect
        x={
          direction === 'horizontal'
            ? referencePoint.x + previewLength / 2 + 7
            : referencePoint.x + 7
        }
        y={
          direction === 'horizontal'
            ? referencePoint.y - 6
            : referencePoint.y - previewLength / 2 - 16
        }
        width={label === 'VL1' ? 26 : 28}
        height="16"
        fill="white"
        opacity="0.9"
        rx="2"
      />
      <text
        x={
          direction === 'horizontal'
            ? referencePoint.x + previewLength / 2 + 21
            : referencePoint.x + 20
        }
        y={
          direction === 'horizontal'
            ? referencePoint.y + 4.2
            : referencePoint.y - previewLength / 2 - 3.8
        }
        fill="#00ff00"
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function renderDynamicShapePreview(
  selectedTool: string,
  drawingState: DrawingState,
  imageToScreen: (point: Point) => Point
) {
  if (
    !drawingState.isDrawing ||
    !drawingState.startPoint ||
    !drawingState.currentPoint
  ) {
    return null;
  }

  const startScreen = imageToScreen(drawingState.startPoint);
  const endScreen = imageToScreen(drawingState.currentPoint);

  if (selectedTool === 'circle') {
    const radius = Math.hypot(
      endScreen.x - startScreen.x,
      endScreen.y - startScreen.y
    );
    return (
      <circle
        key="circle-preview"
        cx={startScreen.x}
        cy={startScreen.y}
        r={radius}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.4"
      />
    );
  }

  if (selectedTool === 'ellipse') {
    return (
      <ellipse
        key="ellipse-preview"
        cx={startScreen.x}
        cy={startScreen.y}
        rx={Math.abs(endScreen.x - startScreen.x)}
        ry={Math.abs(endScreen.y - startScreen.y)}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.4"
      />
    );
  }

  if (selectedTool === 'rectangle') {
    return (
      <rect
        key="rectangle-preview"
        x={Math.min(startScreen.x, endScreen.x)}
        y={Math.min(startScreen.y, endScreen.y)}
        width={Math.abs(endScreen.x - startScreen.x)}
        height={Math.abs(endScreen.y - startScreen.y)}
        fill="none"
        stroke="#ec4899"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.4"
      />
    );
  }

  if (selectedTool === 'arrow') {
    return (
      <line
        key="arrow-preview"
        x1={startScreen.x}
        y1={startScreen.y}
        x2={endScreen.x}
        y2={endScreen.y}
        stroke="#f59e0b"
        strokeWidth="2"
        markerEnd="url(#arrowhead-normal)"
        strokeDasharray="5,5"
        opacity="0.4"
      />
    );
  }

  return null;
}

function renderStructuredPreview({
  selectedTool,
  clickedPoints,
  standardDistance,
  standardDistancePoints,
  imageNaturalSize,
  liveMouseImagePoint,
  imageToScreen,
  constrainAuxLinePoint,
}: {
  selectedTool: string;
  clickedPoints: Point[];
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageNaturalSize: { width: number; height: number } | null;
  liveMouseImagePoint: Point | null;
  imageToScreen: (point: Point) => Point;
  constrainAuxLinePoint: (
    toolId: string,
    firstPoint: Point,
    rawPoint: Point
  ) => Point;
}) {
  if (selectedTool === 'polygon' && clickedPoints.length > 0) {
    const screenPoints = clickedPoints.map(point => imageToScreen(point));
    return (
      <>
        {screenPoints.map((point, index) => (
          <circle
            key={`polygon-point-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#06b6d4"
            opacity="0.8"
          />
        ))}
        {screenPoints.slice(0, -1).map((point, index) => (
          <line
            key={`polygon-line-${index}`}
            x1={point.x}
            y1={point.y}
            x2={screenPoints[index + 1].x}
            y2={screenPoints[index + 1].y}
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        ))}
      </>
    );
  }

  if (selectedTool === 'vertebra-center' && clickedPoints.length > 0) {
    const screenPoints = clickedPoints.map(point => imageToScreen(point));
    return (
      <>
        {screenPoints.map((point, index) => (
          <circle
            key={`vertebra-point-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#10b981"
            opacity="0.8"
          />
        ))}
        {screenPoints.slice(0, -1).map((point, index) => (
          <line
            key={`vertebra-line-${index}`}
            x1={point.x}
            y1={point.y}
            x2={screenPoints[index + 1].x}
            y2={screenPoints[index + 1].y}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        ))}
        {screenPoints.length >= 3 && (
          <line
            key="vertebra-line-close"
            x1={screenPoints[screenPoints.length - 1].x}
            y1={screenPoints[screenPoints.length - 1].y}
            x2={screenPoints[0].x}
            y2={screenPoints[0].y}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}
        {clickedPoints.length === 4 && (() => {
          const center = calculateQuadrilateralCenter(clickedPoints);
          const centerScreen = imageToScreen(center);
          return (
            <g>
              <circle
                cx={centerScreen.x}
                cy={centerScreen.y}
                r="6"
                fill="#10b981"
                opacity="0.5"
              />
              <text
                x={centerScreen.x}
                y={centerScreen.y - 12}
                fill="#10b981"
                fontSize="12"
                textAnchor="middle"
                opacity="0.7"
              >
                中心
              </text>
            </g>
          );
        })()}
      </>
    );
  }

  if (selectedTool === 'aux-length' && clickedPoints.length > 0) {
    const screenPoints = clickedPoints.map(point => imageToScreen(point));
    return (
      <>
        {screenPoints.map((point, index) => (
          <circle
            key={`aux-length-point-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6"
            opacity="0.8"
          />
        ))}
        {screenPoints.length === 2 && (() => {
          const config = getAnnotationConfig('aux-length');
          const results =
            config?.calculateResults(clickedPoints, {
              standardDistance,
              standardDistancePoints,
              imageNaturalSize,
            }) || [];
          const distanceText =
            results.length > 0 ? `${results[0].value}${results[0].unit}` : '';
          const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
          const midY = (screenPoints[0].y + screenPoints[1].y) / 2;

          return (
            <>
              <line
                x1={screenPoints[0].x}
                y1={screenPoints[0].y}
                x2={screenPoints[1].x}
                y2={screenPoints[1].y}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
              <text
                x={midX}
                y={midY - 10}
                fill="#3b82f6"
                fontSize="12"
                textAnchor="middle"
                opacity="0.7"
              >
                {distanceText}
              </text>
            </>
          );
        })()}
      </>
    );
  }

  if (
    (selectedTool === 'aux-horizontal-line' ||
      selectedTool === 'aux-vertical-line') &&
    clickedPoints.length > 0
  ) {
    const previewPoints = [...clickedPoints];
    if (clickedPoints.length === 1 && liveMouseImagePoint) {
      previewPoints.push(
        constrainAuxLinePoint(selectedTool, clickedPoints[0], liveMouseImagePoint)
      );
    }
    const screenPoints = previewPoints.map(point => imageToScreen(point));

    return (
      <>
        {screenPoints.map((point, index) => (
          <circle
            key={`aux-orth-point-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#22c55e"
            opacity="0.85"
          />
        ))}
        {screenPoints.length === 2 && (
          <line
            x1={screenPoints[0].x}
            y1={screenPoints[0].y}
            x2={screenPoints[1].x}
            y2={screenPoints[1].y}
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.8"
          />
        )}
      </>
    );
  }

  if (selectedTool === 'aux-angle' && clickedPoints.length > 0) {
    const screenPoints = clickedPoints.map(point => imageToScreen(point));
    return (
      <>
        {screenPoints.map((point, index) => (
          <circle
            key={`aux-angle-point-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#8b5cf6"
            opacity="0.8"
          />
        ))}
        {screenPoints.length >= 2 && (
          <line
            x1={screenPoints[0].x}
            y1={screenPoints[0].y}
            x2={screenPoints[1].x}
            y2={screenPoints[1].y}
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}
        {screenPoints.length >= 4 && (
          <line
            x1={screenPoints[2].x}
            y1={screenPoints[2].y}
            x2={screenPoints[3].x}
            y2={screenPoints[3].y}
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}
        {screenPoints.length === 4 && (() => {
          const config = getAnnotationConfig('aux-angle');
          const results =
            config?.calculateResults(clickedPoints, {
              standardDistance,
              standardDistancePoints,
              imageNaturalSize,
            }) || [];
          const angleText =
            results.length > 0 ? `${results[0].value}${results[0].unit}` : '';
          const centerPoint = {
            x:
              (screenPoints[0].x +
                screenPoints[1].x +
                screenPoints[2].x +
                screenPoints[3].x) /
              4,
            y:
              (screenPoints[0].y +
                screenPoints[1].y +
                screenPoints[2].y +
                screenPoints[3].y) /
              4,
          };

          return (
            <text
              x={centerPoint.x}
              y={centerPoint.y - 15}
              fill="#8b5cf6"
              fontSize="12"
              textAnchor="middle"
              opacity="0.7"
            >
              {angleText}
            </text>
          );
        })()}
      </>
    );
  }

  return null;
}

/**
 * 预览层。
 * 当前承接标准距离、参考线、工作点和主工具预览，入口组件不再直接承载 preview JSX。
 */
export default function PreviewLayer({
  selectedTool,
  currentTool,
  clickedPoints,
  measurements,
  referenceLines,
  standardDistance,
  standardDistancePoints,
  hoveredStandardPointIndex,
  draggingStandardPointIndex,
  isStandardDistanceHidden,
  imageScale,
  imageNaturalSize,
  liveMouseImagePoint,
  drawingState,
  imageToScreen,
  constrainAuxLinePoint,
  workingPointHoverIndex,
  getInheritedPoints,
}: PreviewLayerProps) {
  return (
    <>
      {!isStandardDistanceHidden &&
        standardDistancePoints.map((point, index) => {
          const screenPoint = imageToScreen(point);
          const isHovered = hoveredStandardPointIndex === index;
          const isDragging = draggingStandardPointIndex === index;
          return (
            <g key={`standard-distance-${index}`}>
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r={isHovered || isDragging ? '6' : '4'}
                fill={isHovered || isDragging ? '#fbbf24' : '#9333ea'}
                stroke="#ffffff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
              />
              <rect
                x={screenPoint.x + (isHovered || isDragging ? 7 : 5)}
                y={screenPoint.y - (isHovered || isDragging ? 16 : 14)}
                width={isHovered || isDragging ? '12' : '10'}
                height={isHovered || isDragging ? '14' : '12'}
                fill="white"
                opacity="0.9"
                rx="2"
              />
              <text
                x={screenPoint.x + (isHovered || isDragging ? 13 : 10)}
                y={screenPoint.y - 4}
                fill={isHovered || isDragging ? '#fbbf24' : '#9333ea'}
                fontSize={isHovered || isDragging ? '14' : '12'}
                fontWeight="bold"
                textAnchor="middle"
              >
                {index + 1}
              </text>
            </g>
          );
        })}

      {!isStandardDistanceHidden &&
        standardDistancePoints.length === 2 &&
        (() => {
          const p1 = imageToScreen(standardDistancePoints[0]);
          const p2 = imageToScreen(standardDistancePoints[1]);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const tickLength = 10;
          const perpAngle = ((angle + 90) * Math.PI) / 180;

          return (
            <g>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#9333ea"
                strokeWidth="2"
              />
              <line
                x1={p1.x - Math.cos(perpAngle) * tickLength}
                y1={p1.y - Math.sin(perpAngle) * tickLength}
                x2={p1.x + Math.cos(perpAngle) * tickLength}
                y2={p1.y + Math.sin(perpAngle) * tickLength}
                stroke="#9333ea"
                strokeWidth="2"
              />
              <line
                x1={p2.x - Math.cos(perpAngle) * tickLength}
                y1={p2.y - Math.sin(perpAngle) * tickLength}
                x2={p2.x + Math.cos(perpAngle) * tickLength}
                y2={p2.y + Math.sin(perpAngle) * tickLength}
                stroke="#9333ea"
                strokeWidth="2"
              />
            </g>
          );
        })()}

      {selectedTool !== 'hand' &&
        renderPreview({
          selectedTool,
          currentTool,
          clickedPoints,
          measurements,
          imageScale,
          imageToScreen,
          getInheritedPoints,
        })}

      {renderDynamicShapePreview(selectedTool, drawingState, imageToScreen)}

      {renderStructuredPreview({
        selectedTool,
        clickedPoints,
        standardDistance,
        standardDistancePoints,
        imageNaturalSize,
        liveMouseImagePoint,
        imageToScreen,
        constrainAuxLinePoint,
      })}

      {(selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')) &&
        referenceLines.t1Tilt && (
          <ReferenceLinePreview
            point={referenceLines.t1Tilt}
            imageScale={imageScale}
            imageToScreen={imageToScreen}
            direction="horizontal"
            label="HRL"
          />
        )}
      {selectedTool.includes('ca') && referenceLines.ca && (
        <ReferenceLinePreview
          point={referenceLines.ca}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="horizontal"
          label="HRL"
        />
      )}
      {selectedTool.includes('pelvic') && referenceLines.pelvic && (
        <ReferenceLinePreview
          point={referenceLines.pelvic}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="horizontal"
          label="HRL"
        />
      )}
      {selectedTool.includes('ss') && referenceLines.ss && (
        <ReferenceLinePreview
          point={referenceLines.ss}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="horizontal"
          label="HRL"
        />
      )}
      {selectedTool.includes('sacral') && referenceLines.sacral && (
        <ReferenceLinePreview
          point={referenceLines.sacral}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="horizontal"
          label="HRL"
        />
      )}
      {selectedTool.includes('avt') && referenceLines.avt && (
        <ReferenceLinePreview
          point={referenceLines.avt}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="vertical"
          label="VL1"
        />
      )}
      {selectedTool.includes('ts') && referenceLines.ts && (
        <ReferenceLinePreview
          point={referenceLines.ts}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="horizontal"
          label="HL1"
          lineLength={150 * imageScale}
        />
      )}
      {selectedTool.includes('lld') && referenceLines.lld && (
        <ReferenceLinePreview
          point={referenceLines.lld}
          imageScale={imageScale}
          imageToScreen={imageToScreen}
          direction="horizontal"
          label="HL1"
          lineLength={150 * imageScale}
        />
      )}

      {clickedPoints.map((point, index) => {
        const screenPoint = imageToScreen(point);
        const isHovered = workingPointHoverIndex === index;
        return (
          <g key={`current-${index}`}>
            <circle
              cx={screenPoint.x}
              cy={screenPoint.y}
              r={isHovered ? '6' : '4'}
              fill="#ef4444"
              stroke={isHovered ? '#fbbf24' : '#ffffff'}
              strokeWidth={isHovered ? '3' : '2'}
            />
            {isHovered && (
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r="9"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                opacity="0.6"
              />
            )}
            <rect
              x={screenPoint.x + 4}
              y={screenPoint.y - (isHovered ? 16 : 14)}
              width={(isHovered ? 14 : 12) * 0.7}
              height={(isHovered ? 14 : 12) * 1.0}
              fill="white"
              opacity="0.9"
              rx="2"
            />
            <text
              x={screenPoint.x + (isHovered ? 8.5 : 7.5)}
              y={screenPoint.y - 4}
              fill={isHovered ? '#fbbf24' : '#ef4444'}
              fontSize={isHovered ? '14' : '12'}
              fontWeight="bold"
            >
              {index + 1}
            </text>
          </g>
        );
      })}

      {selectedTool.includes('ts') &&
        clickedPoints.length === 1 &&
        liveMouseImagePoint &&
        (() => {
          const firstPoint = imageToScreen(clickedPoints[0]);
          const constrainedSecondPoint = imageToScreen({
            x: liveMouseImagePoint.x,
            y: clickedPoints[0].y,
          });
          return (
            <line
              x1={firstPoint.x}
              y1={firstPoint.y}
              x2={constrainedSecondPoint.x}
              y2={constrainedSecondPoint.y}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
          );
        })()}
    </>
  );
}
