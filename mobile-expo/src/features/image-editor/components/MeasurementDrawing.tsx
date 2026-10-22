import { memo } from 'react';
import {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getAnnotationTypeId,
  getColorForType,
  getInteractivePointsCount,
} from '@xiehe/imaging-catalog/annotations';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import { measurementGeometry } from './measurementGeometry';

export const MeasurementDrawing = memo(function MeasurementDrawing({
  measurement,
  context,
  selected,
}: {
  measurement: MeasurementData;
  context: TransformContext;
  selected: boolean;
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
  const interactive = getInteractivePointsCount(measurement.type) ?? p.length;
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
      {!selected &&
        p
          .slice(0, interactive)
          .map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={3}
              fill="#111827"
              stroke={color}
              strokeWidth={1.5}
            />
          ))}
    </G>
  );
});
