import { Measurement, Point } from '../../../types';
import renderPreview from '../renderers/renderPreview';
import { ReferenceLines, DrawingState } from '../types';

interface PreviewLayerProps {
  selectedTool: string;
  currentTool: { id: string; name: string; pointsNeeded: number } | null;
  clickedPoints: Point[];
  measurements: Measurement[];
  referenceLines: ReferenceLines;
  standardDistancePoints: Point[];
  hoveredStandardPointIndex: number | null;
  draggingStandardPointIndex: number | null;
  isStandardDistanceHidden: boolean;
  imageScale: number;
  liveMouseImagePoint: Point | null;
  drawingState: DrawingState;
  imageToScreen: (point: Point) => Point;
  getInheritedPoints: (
    toolId: string,
    measurements: { type: string; points: Point[] }[]
  ) => { points: Point[]; count: number };
  children?: React.ReactNode;
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

/**
 * 预览层。
 * 当前承接标准距离、参考线、点击点和主工具预览，逐步把 preview JSX 从入口组件迁出。
 */
export default function PreviewLayer({
  selectedTool,
  currentTool,
  clickedPoints,
  measurements,
  referenceLines,
  standardDistancePoints,
  hoveredStandardPointIndex,
  draggingStandardPointIndex,
  isStandardDistanceHidden,
  imageScale,
  liveMouseImagePoint,
  drawingState,
  imageToScreen,
  getInheritedPoints,
  children,
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
        return (
          <g key={`current-${index}`}>
            <circle
              cx={screenPoint.x}
              cy={screenPoint.y}
              r="4"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <rect
              x={screenPoint.x + 4}
              y={screenPoint.y - 14}
              width="8.4"
              height="12"
              fill="white"
              opacity="0.9"
              rx="2"
            />
            <text
              x={screenPoint.x + 7.5}
              y={screenPoint.y - 4}
              fill="#ef4444"
              fontSize="12"
              fontWeight="bold"
            >
              {index + 1}
            </text>
          </g>
        );
      })}

      {selectedTool.includes('ts') &&
        clickedPoints.length === 1 &&
        liveMouseImagePoint && (
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
          })()
        )}

      {drawingState.isDrawing &&
        drawingState.startPoint &&
        drawingState.currentPoint &&
        children}
    </>
  );
}
