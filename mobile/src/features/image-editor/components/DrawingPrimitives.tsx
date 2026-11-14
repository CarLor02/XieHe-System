import { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg';
import {
  angleArcPath,
  type DrawingPrimitive,
} from '@xiehe/imaging-core/canvas';

export function DrawingPrimitives({
  primitives,
  color,
}: {
  primitives: DrawingPrimitive[];
  color: string;
}) {
  const resolveColor = (value: string | undefined, fallback: string) =>
    value === 'currentColor' ? color : (value ?? fallback);
  return (
    <G>
      {primitives.map((p, index) => {
        if (p.kind === 'vertebra')
          return (
            <DrawingPrimitives
              key={index}
              primitives={p.children}
              color={color}
            />
          );
        if (p.kind === 'text') return null;
        const style = {
          stroke: resolveColor(p.stroke, color),
          strokeWidth: p.strokeWidth ?? 2,
          strokeDasharray: p.dash,
          opacity: p.opacity,
          fill: resolveColor(p.fill, 'none'),
        };
        switch (p.kind) {
          case 'line':
            return (
              <Line
                key={index}
                {...style}
                x1={p.start.x}
                y1={p.start.y}
                x2={p.end.x}
                y2={p.end.y}
              />
            );
          case 'circle':
            return (
              <Circle
                key={index}
                {...style}
                cx={p.center.x}
                cy={p.center.y}
                r={p.radius}
              />
            );
          case 'ellipse':
            return (
              <Ellipse
                key={index}
                {...style}
                cx={p.center.x}
                cy={p.center.y}
                rx={p.rx}
                ry={p.ry}
              />
            );
          case 'polygon':
            return (
              <Polygon
                key={index}
                {...style}
                points={p.points
                  .map(point => `${point.x},${point.y}`)
                  .join(' ')}
              />
            );
          case 'arc':
            return <Path key={index} {...style} d={angleArcPath(p)} />;
        }
      })}
    </G>
  );
}
