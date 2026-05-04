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
 * IR/IL/SR/SL/CR/CL 是骨盆/肩膀解剖标志点，AI 检测时存为 corners:[pt,pt,pt,pt]（单点复制）。
 * 渲染为单点（菱形）而非椎体四角框。
 */
const POSE_LABELS = new Set(['CR', 'CL', 'IR', 'IL', 'SR', 'SL']);

/**
 * 椎体标注层 — 纯渲染组件（SVG 内使用）。
 * corners 顺序: [TL, TR, BL, BR]
 *
 * 所有交互（命中检测、拖拽）由父组件的 useVertebradDrag hook 处理，
 * 本组件不持有任何内部状态，也不注册任何事件监听器。
 *
 * 渲染策略：
 *   - 椎体（T1~L5, C7 等）：4角框 + 4角点小圆
 *   - pose 关键点（IR/IL 等）：单点菱形标记
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
        const isPose = POSE_LABELS.has(vertebra.label);

        // pose 关键点：corners 四值相同，取 corners[0] 为坐标
        if (isPose) {
          const sc = imageToScreen(vertebra.corners[0]);
          const isActive  = activeCorner?.label  === vertebra.label;
          const isHovered = hoveredCorner?.label === vertebra.label;
          const r = isActive || isHovered ? 7 : 5;
          const fill = isActive
            ? 'rgba(239, 68, 68, 0.95)'
            : isHovered
            ? 'rgba(96, 165, 250, 1)'
            : 'rgba(59, 130, 246, 0.85)';
          // 菱形（旋转 45° 的正方形）
          const d = r * 1.2;
          const diamond = `${sc.x},${sc.y - d} ${sc.x + d},${sc.y} ${sc.x},${sc.y + d} ${sc.x - d},${sc.y}`;

          return (
            <g key={vertebra.label} className="pose-annotation">
              <polygon
                points={diamond}
                fill={fill}
                stroke="white"
                strokeWidth={1.2}
              />
              <text
                x={sc.x + 10}
                y={sc.y + 4}
                fontSize={10}
                fontWeight="600"
                fill="rgba(147, 197, 253, 1)"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {vertebra.label}
              </text>
            </g>
          );
        }

        // 椎体：4角框 + 4角点小圆
        const [tl, tr, bl, br] = vertebra.corners.map(imageToScreen);
        const polyPts = [tl, tr, br, bl].map(p => `${p.x},${p.y}`).join(' ');
        const cx = (tl.x + tr.x + bl.x + br.x) / 4;
        const cy = (tl.y + tr.y + bl.y + br.y) / 4;
        // 标签放在右侧中点的右边
        const labelX = Math.max(tr.x, br.x) + 6;
        const labelY = (tr.y + br.y) / 2 + 4;

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
              const isActive  = activeCorner?.label  === vertebra.label && activeCorner?.index === i;
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
              textAnchor="start"
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
            <circle cx={cx} cy={cy} r={1.5} fill="rgba(59, 130, 246, 0.5)" />
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
