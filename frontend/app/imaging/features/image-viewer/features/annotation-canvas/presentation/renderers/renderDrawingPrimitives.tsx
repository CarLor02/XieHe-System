import type { DrawingPrimitive } from '@xiehe/imaging-core/canvas';
import { angleArcPath } from '@xiehe/imaging-core/canvas';

/** Web 仅负责 SVG 属性映射，辅助线长度和布局统一由共享画布包计算。 */
export function renderDrawingPrimitives(
  primitives: DrawingPrimitive[],
  color: string
) {
  const resolveColor = (value: string | undefined, fallback: string) =>
    value === 'currentColor' ? color : (value ?? fallback);
  return (
    <>
      {primitives.map((p, index) => {
        const style = {
          stroke: resolveColor(p.stroke, color),
          strokeWidth: p.strokeWidth ?? 2,
          strokeDasharray: p.dash,
          opacity: p.opacity,
          fill: resolveColor(p.fill, 'none'),
          'data-vertebra-geometry-part': p.part,
        };
        switch (p.kind) {
          case 'line':
            return (
              <line
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
              <circle
                key={index}
                {...style}
                cx={p.center.x}
                cy={p.center.y}
                r={p.radius}
              />
            );
          case 'ellipse':
            return (
              <ellipse
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
              <polygon
                key={index}
                {...style}
                points={p.points
                  .map(point => `${point.x},${point.y}`)
                  .join(' ')}
              />
            );
          case 'arc':
            return <path key={index} {...style} d={angleArcPath(p)} />;
          case 'text':
            return (
              <text
                key={index}
                x={p.point.x}
                y={p.point.y}
                fill={resolveColor(p.fill, color)}
                fontSize={p.fontSize}
                fontWeight="bold"
                textAnchor={p.text === 'CFH' ? 'start' : 'middle'}
                stroke="#000000"
                strokeWidth={p.text === 'CFH' ? 0.5 : 1.5}
                paintOrder="stroke"
              >
                {p.text}
              </text>
            );
          case 'vertebra':
            return (
              <g key={index} data-vertebra-center-geometry="true">
                {renderDrawingPrimitives(p.children, color)}
              </g>
            );
        }
      })}
    </>
  );
}
