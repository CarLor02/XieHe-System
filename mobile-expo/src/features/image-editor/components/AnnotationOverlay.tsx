import { memo } from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { StyleSheet } from 'react-native';
import { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import {
  getAnnotationDisplayName,
  getAnnotationTypeId,
  getColorForType,
  getInteractivePointsCount,
  getLabelPositionForType,
} from '@xiehe/imaging-catalog/annotations';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import { getBilateralPelvicGeometryForMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import type { EditorSelection } from '../application/dragAnnotation';
import { measurementGeometry } from './measurementGeometry';
import {
  AnimatedSvgGroup,
  ControlPoint,
  svgMatrixProps,
} from './AnimatedControlPoint';
import {
  viewportMatrix,
  type DragPreview,
  type Viewport,
} from './interaction/canvasGestureModel';
const MeasurementDrawing = memo(function MeasurementDrawing({
  measurement,
  context,
  selected,
  showLabels,
  dragPreview,
}: {
  measurement: MeasurementData;
  context: TransformContext;
  selected: boolean;
  showLabels: boolean;
  dragPreview: SharedValue<DragPreview>;
}) {
  const project = (point: Point) => imageToScreen(point, context);
  const p = measurement.points.map(project);
  if (!p.length) return null;
  const type = getAnnotationTypeId(measurement.type);
  const color = selected ? '#FBBF24' : getColorForType(measurement.type);
  const geometry = measurementGeometry(
    measurement,
    context.imageNaturalSize?.height ?? 0
  );
  const labelPosition = project(
    getLabelPositionForType(
      measurement.type,
      measurement.points,
      context.imageScale
    )
  );
  const label = `${getAnnotationDisplayName(measurement.type)}${measurement.value ? `  ${measurement.value}` : ''}`;
  const textWidth = Math.min(210, label.length * 7 + 16);
  const labelX = Math.max(
    8,
    Math.min(
      (context.containerSize?.width ?? 300) - textWidth - 68,
      labelPosition.x + 12
    )
  );
  const labelY = Math.max(
    24,
    Math.min((context.containerSize?.height ?? 300) - 8, labelPosition.y - 10)
  );
  const interactive = getInteractivePointsCount(measurement.type) ?? p.length;
  const effectiveCfh =
    getBilateralPelvicGeometryForMeasurement(measurement)?.femoralHeadCenter;
  return (
    <G>
      {geometry.lines.map((line, i) => {
        const a = project(line.start),
          b = project(line.end);
        return (
          <Line
            key={`l${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth={selected ? 2 : 1.5}
            strokeDasharray={line.dashed ? '5 4' : undefined}
            opacity={line.dashed ? 0.65 : 0.95}
          />
        );
      })}
      {geometry.polygons.map((polygon, i) => (
        <Polygon
          key={`p${i}`}
          points={polygon
            .map(project)
            .map(point => `${point.x},${point.y}`)
            .join(' ')}
          fill={`${color}12`}
          stroke={color}
          strokeWidth={1.5}
        />
      ))}
      {geometry.circles.map((circle, i) => {
        const center = project(circle.center),
          edge = project(circle.radiusHandle);
        return (
          <Circle
            key={`c${i}`}
            cx={center.x}
            cy={center.y}
            r={Math.hypot(edge.x - center.x, edge.y - center.y)}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
        );
      })}
      {type === 'rectangle' && p.length === 2 && (
        <Rect
          x={Math.min(p[0].x, p[1].x)}
          y={Math.min(p[0].y, p[1].y)}
          width={Math.abs(p[1].x - p[0].x)}
          height={Math.abs(p[1].y - p[0].y)}
          fill={`${color}12`}
          stroke={color}
          strokeWidth={1.5}
        />
      )}
      {type === 'ellipse' && p.length === 2 && (
        <Ellipse
          cx={(p[0].x + p[1].x) / 2}
          cy={(p[0].y + p[1].y) / 2}
          rx={Math.abs(p[1].x - p[0].x) / 2}
          ry={Math.abs(p[1].y - p[0].y) / 2}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
      )}
      {type === 'arrow' &&
        p.length === 2 &&
        (() => {
          const angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
          return (
            <Path
              d={`M${p[1].x - 11 * Math.cos(angle - 0.45)},${p[1].y - 11 * Math.sin(angle - 0.45)} L${p[1].x},${p[1].y} L${p[1].x - 11 * Math.cos(angle + 0.45)},${p[1].y - 11 * Math.sin(angle + 0.45)}`}
              stroke={color}
              strokeWidth={1.5}
              fill="none"
            />
          );
        })()}
      {p.slice(0, interactive).map((point, index) => (
        <ControlPoint
          key={`h${index}`}
          enabled={selected}
          pointKey={`point:${measurement.id}:${index}`}
          point={point}
          context={context}
          preview={dragPreview}
        >
          {selected && (
            <Circle cx={point.x} cy={point.y} r={12} fill="#FBBF241A" />
          )}
          <Circle
            cx={point.x}
            cy={point.y}
            r={selected ? 5 : 3}
            fill={selected ? '#FBBF24' : '#111827'}
            stroke={color}
            strokeWidth={1.5}
          />
          {selected && (
            <SvgText x={point.x + 8} y={point.y - 8} fill={color} fontSize={10}>
              {index + 1}
            </SvgText>
          )}
        </ControlPoint>
      ))}
      {selected &&
        effectiveCfh &&
        (() => {
          const point = project(effectiveCfh);
          return (
            <ControlPoint
              enabled
              pointKey={`cfh:${measurement.id}`}
              point={point}
              context={context}
              preview={dragPreview}
            >
              <Circle
                cx={point.x}
                cy={point.y}
                r={6}
                fill="#111827"
                stroke="#FBBF24"
                strokeWidth={2}
              />
            </ControlPoint>
          );
        })()}
      {showLabels && (
        <G>
          <Rect
            x={labelX}
            y={labelY - 16}
            width={textWidth}
            height={23}
            rx={4}
            fill="#111827E8"
            stroke={color}
            strokeWidth={0.7}
          />
          <SvgText
            x={labelX + 7}
            y={labelY}
            fill={color}
            fontSize={11}
            fontWeight="500"
          >
            {label}
          </SvgText>
        </G>
      )}
    </G>
  );
});
export const AnnotationOverlay = memo(function AnnotationOverlay({
  snapshot,
  context,
  selection,
  showLabels,
  showKeypoints,
  draftPoints,
  preview,
  viewport,
  dragPreview,
}: {
  snapshot: AnnotationEditorSnapshot;
  context: TransformContext;
  selection: EditorSelection | null;
  showLabels: boolean;
  showKeypoints: boolean;
  draftPoints: Point[];
  preview: MeasurementData | null;
  viewport: SharedValue<Viewport>;
  dragPreview: SharedValue<DragPreview>;
}) {
  const project = (point: Point) => imageToScreen(point, context);
  const renderedViewport = {
    imageScale: context.imageScale,
    imagePosition: context.imagePosition,
  };
  const center = {
    x: (context.containerSize?.width ?? 0) / 2,
    y: (context.containerSize?.height ?? 0) / 2,
  };
  const transform = useAnimatedProps(() =>
    svgMatrixProps(viewportMatrix(viewport.get(), renderedViewport, center))
  );
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      width={context.containerSize?.width ?? 0}
      height={context.containerSize?.height ?? 0}
    >
      <AnimatedSvgGroup animatedProps={transform}>
        {snapshot.measurements.map(measurement => (
          <MeasurementDrawing
            key={measurement.id}
            measurement={measurement}
            context={context}
            selected={
              !!selection &&
              'measurementId' in selection &&
              selection.measurementId === measurement.id
            }
            showLabels={showLabels}
            dragPreview={dragPreview}
          />
        ))}
        {showKeypoints &&
          snapshot.keypoints.map(keypoint => {
            const point = project(keypoint.point);
            const selected =
              selection?.kind === 'keypoint' &&
              selection.keypointId === keypoint.id;
            return (
              <ControlPoint
                key={keypoint.id}
                enabled={selected}
                pointKey={`keypoint:${keypoint.id}`}
                point={point}
                context={context}
                preview={dragPreview}
              >
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={selected ? 7 : 4}
                  fill="#111827"
                  stroke={selected ? '#FBBF24' : '#34D399'}
                  strokeWidth={1.5}
                />
                {(showLabels || selected) && (
                  <SvgText
                    x={point.x + 8}
                    y={point.y - 7}
                    fill="#6EE7B7"
                    fontSize={10}
                  >
                    {keypoint.id}
                  </SvgText>
                )}
              </ControlPoint>
            );
          })}
        {snapshot.standardDistancePoints.length === 2 &&
          (() => {
            const [a, b] = snapshot.standardDistancePoints.map(project);
            return (
              <G>
                <Line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#FBBF24"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                {[a, b].map((p, index) => (
                  <ControlPoint
                    key={index}
                    enabled={
                      selection?.kind === 'calibration' &&
                      selection.pointIndex === index
                    }
                    pointKey={`calibration:${index}`}
                    point={p}
                    context={context}
                    preview={dragPreview}
                  >
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={5}
                      stroke="#FBBF24"
                      fill="#111827"
                    />
                  </ControlPoint>
                ))}
                {showLabels && (
                  <SvgText
                    x={(a.x + b.x) / 2 + 7}
                    y={(a.y + b.y) / 2 - 8}
                    fill="#FBBF24"
                    fontSize={11}
                  >
                    {snapshot.standardDistance} mm
                  </SvgText>
                )}
              </G>
            );
          })()}
        {preview && (
          <MeasurementDrawing
            measurement={preview}
            context={context}
            selected
            showLabels={false}
            dragPreview={dragPreview}
          />
        )}
        {draftPoints.map((point, index) => {
          const p = project(point);
          return (
            <G key={`draft${index}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={6}
                fill="#2563EB"
                stroke="#BFDBFE"
                strokeWidth={2}
              />
              <SvgText x={p.x + 9} y={p.y - 8} fontSize={11} fill="#BFDBFE">
                {index + 1}
              </SvgText>
            </G>
          );
        })}
      </AnimatedSvgGroup>
    </Svg>
  );
});
