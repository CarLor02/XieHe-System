'use client';

import { CfhAnnotation, Point, VertebraAnnotation } from '../../../types';

interface VertebraeLayerProps {
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  /** 将图像坐标系的点转换为屏幕(SVG)坐标系 */
  imageToScreen: (point: Point) => Point;
}

/**
 * 椎体标注层渲染组件（SVG 内使用）。
 * corners 顺序: [TL, TR, BL, BR]
 * 渲染四边形连线: TL→TR→BR→BL→TL
 */
export default function VertebraeLayer({
  vertebraeLayer,
  cfhAnnotation,
  imageToScreen,
}: VertebraeLayerProps) {
  return (
    <g className="vertebrae-layer">
      {vertebraeLayer.map(vertebra => {
        const [tl, tr, bl, br] = vertebra.corners.map(imageToScreen);

        // 多边形顶点: TL → TR → BR → BL → 回到 TL
        const points = [tl, tr, br, bl].map(p => `${p.x},${p.y}`).join(' ');

        // 标签位置：4个角的平均中心
        const cx = (tl.x + tr.x + bl.x + br.x) / 4;
        const cy = (tl.y + tr.y + bl.y + br.y) / 4;

        // 标签跟随顶边中点，偏上方
        const labelX = (tl.x + tr.x) / 2;
        const labelY = Math.min(tl.y, tr.y) - 6;

        return (
          <g key={vertebra.label} className="vertebra-annotation">
            {/* 四边形边框 */}
            <polygon
              points={points}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.85)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />

            {/* 4个角点小圆 */}
            {[tl, tr, bl, br].map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill="rgba(59, 130, 246, 0.9)"
                stroke="white"
                strokeWidth={1}
              />
            ))}

            {/* 椎体名称标签 */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize={10}
              fontWeight="600"
              fill="rgba(147, 197, 253, 1)"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={2.5}
              paintOrder="stroke"
            >
              {vertebra.label}
            </text>

            {/* 中心点（调试辅助，可删） */}
            <circle
              cx={cx}
              cy={cy}
              r={1.5}
              fill="rgba(59, 130, 246, 0.5)"
            />
          </g>
        );
      })}

      {/* 股骨头中心点 */}
      {cfhAnnotation && (() => {
        const sc = imageToScreen(cfhAnnotation.center);
        return (
          <g key="cfh" className="cfh-annotation">
            <circle
              cx={sc.x}
              cy={sc.y}
              r={6}
              fill="none"
              stroke="rgba(251, 191, 36, 0.9)"
              strokeWidth={1.5}
            />
            <circle
              cx={sc.x}
              cy={sc.y}
              r={2}
              fill="rgba(251, 191, 36, 0.9)"
            />
            <text
              x={sc.x + 9}
              y={sc.y + 4}
              fontSize={10}
              fontWeight="600"
              fill="rgba(251, 191, 36, 1)"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={2.5}
              paintOrder="stroke"
            >
              CFH
            </text>
          </g>
        );
      })()}
    </g>
  );
}
