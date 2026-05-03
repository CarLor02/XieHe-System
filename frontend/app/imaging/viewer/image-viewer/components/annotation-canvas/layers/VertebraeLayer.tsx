'use client';

import { CfhAnnotation, Point, VertebraAnnotation } from '../../../types';

interface CornerRef {
  label: string;
  index: number;
}

interface VertebraeLayerProps {
  /** 要渲染的图层（由父组件的 useVertebradDrag 提供，拖拽时为实时图层） */
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  /** 将图像坐标系的点转换为屏幕(SVG)坐标系 */
  imageToScreen: (point: Point) => Point;
  /** 当前被激活（拖拽中）的角点，用于高亮 */
  activeCorner?: CornerRef | null;
  /** 当前鼠标悬停的角点，用于高亮 */
  hoveredCorner?: CornerRef | null;
}

/**
 * 椎体标注层 — 纯渲染组件（SVG 内使用）。
 * corners 顺序: [TL, TR, BL, BR]
 *
 * 所有交互（命中检测、拖拽）由父组件的 useVertebradDrag hook 处理，
 * 本组件不持有任何内部状态，也不注册任何事件监听器。
 */
export default function VertebraeLayer({
  vertebraeLayer,
  cfhAnnotation,
  imageToScreen,
  activeCorner = null,
  hoveredCorner = null,
}: VertebraeLayerProps) {

  return (
    // 纯渲染，不需要事件，保持 pointer-events: none 继承自父 SVG
    <g className="vertebrae-layer">
      {vertebraeLayer.map(vertebra => {
        const [tl, tr, bl, br] = vertebra.corners.map(imageToScreen);

        // 多边形顶点: TL → TR → BR → BL → 回到 TL
        const polyPts = [tl, tr, br, bl].map(p => `${p.x},${p.y}`).join(' ');

        // 中心点
        const cx = (tl.x + tr.x + bl.x + br.x) / 4;
        const cy = (tl.y + tr.y + bl.y + br.y) / 4;

        // 标签跟随顶边中点，偏上方
        const labelX = (tl.x + tr.x) / 2;
        const labelY = Math.min(tl.y, tr.y) - 6;

        return (
          <g key={vertebra.label} className="vertebra-annotation">
            {/* 四边形边框 */}
            <polygon
              points={polyPts}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.85)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />

            {/* 4个角点小圆（仅渲染，交互由父组件的 useVertebradDrag 处理） */}
            {[tl, tr, bl, br].map((p, i) => {
              const isHovered = hoveredCorner?.label === vertebra.label && hoveredCorner?.index === i;
              const isActive = activeCorner?.label === vertebra.label && activeCorner?.index === i;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered || isActive ? 5.5 : 3.5}
                  fill={isActive ? 'rgba(239, 68, 68, 0.95)' : isHovered ? 'rgba(96, 165, 250, 1)' : 'rgba(59, 130, 246, 0.9)'}
                  stroke="white"
                  strokeWidth={1}
                />
              );
            })}

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

            {/* 中心点 */}
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
