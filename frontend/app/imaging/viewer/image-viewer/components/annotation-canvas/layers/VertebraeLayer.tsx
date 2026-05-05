'use client';

import { CfhAnnotation, Point, VertebraAnnotation } from '../../../types';
import {
  isAnatomicalPointKeypointLabel,
  isPoseKeypointLabel,
  renderCornerToKeypointId,
  isSacralEndplateKeypointLabel,
  isVertebraCornerKeypointLabel,
} from '../../../domain/keypoint-state';

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
  /** 当前测量项锚定的关键点，用于显示测量项对应的真实可编辑对象 */
  selectedKeypointIds?: Set<string>;
}

const EMPTY_SELECTED_KEYPOINT_IDS = new Set<string>();

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
 *   - S1：两点上终板线
 */
export default function VertebraeLayer({
  vertebraeLayer,
  cfhAnnotation,
  imageToScreen,
  activeCorner = null,
  hoveredCorner = null,
  selectedKeypointIds = EMPTY_SELECTED_KEYPOINT_IDS,
}: VertebraeLayerProps) {
  return (
    // 纯渲染，不需要事件，保持 pointer-events: none 继承自父 SVG
    <g className="vertebrae-layer">
      {vertebraeLayer.map(vertebra => {
        const isPoseKeypoint = isPoseKeypointLabel(vertebra.label);
        const isAnatomicalPoint = isAnatomicalPointKeypointLabel(
          vertebra.label
        );
        const isSacralEndplate = isSacralEndplateKeypointLabel(vertebra.label);
        const isVertebraCornerKeypoint = isVertebraCornerKeypointLabel(
          vertebra.label
        );

        // 姿态关键点：corners 四值相同，取 corners[0] 为坐标，使用菱形。
        if (isPoseKeypoint) {
          const sc = imageToScreen(vertebra.corners[0]);
          const isActive = activeCorner?.label === vertebra.label;
          const isHovered = hoveredCorner?.label === vertebra.label;
          const isSelected = selectedKeypointIds.has(vertebra.label);
          const r = isActive || isHovered || isSelected ? 7 : 5;
          const fill = isActive
            ? 'rgba(239, 68, 68, 0.95)'
            : isHovered
              ? 'rgba(96, 165, 250, 1)'
              : isSelected
                ? 'rgba(250, 204, 21, 0.95)'
                : 'rgba(59, 130, 246, 0.85)';
          const textFill = isActive
            ? 'rgba(255, 255, 255, 1)'
            : isHovered
              ? 'rgba(253, 224, 71, 1)'
              : isSelected
                ? 'rgba(253, 224, 71, 1)'
                : 'rgba(147, 197, 253, 1)';
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
                fill={textFill}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {vertebra.label}
              </text>
            </g>
          );
        }

        if (isAnatomicalPoint) {
          const sc = imageToScreen(vertebra.corners[0]);
          const isActive = activeCorner?.label === vertebra.label;
          const isHovered = hoveredCorner?.label === vertebra.label;
          const isSelected = selectedKeypointIds.has(vertebra.label);
          const textFill = isActive
            ? 'rgba(255, 255, 255, 1)'
            : isHovered
              ? 'rgba(253, 224, 71, 1)'
              : isSelected
                ? 'rgba(253, 224, 71, 1)'
                : 'rgba(251, 191, 36, 1)';

          return (
            <g key={vertebra.label} className="anatomical-point-keypoint">
              <circle
                cx={sc.x}
                cy={sc.y}
                r={isActive || isHovered || isSelected ? 7 : 5}
                fill="none"
                stroke={
                  isActive
                    ? 'rgba(239, 68, 68, 0.95)'
                    : isHovered
                      ? 'rgba(250, 204, 21, 0.95)'
                      : isSelected
                        ? 'rgba(250, 204, 21, 0.95)'
                        : 'rgba(251, 191, 36, 0.9)'
                }
                strokeWidth={1.5}
              />
              <circle
                cx={sc.x}
                cy={sc.y}
                r={isActive || isHovered || isSelected ? 3 : 2}
                fill={
                  isActive
                    ? 'rgba(239, 68, 68, 0.95)'
                    : isHovered
                      ? 'rgba(96, 165, 250, 1)'
                      : isSelected
                        ? 'rgba(250, 204, 21, 0.95)'
                        : 'rgba(251, 191, 36, 0.9)'
                }
              />
              <text
                x={sc.x + 9}
                y={sc.y + 4}
                fontSize={10}
                fontWeight="600"
                fill={textFill}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {vertebra.label}
              </text>
            </g>
          );
        }

        // 不完整椎体组的单个角点：作为普通圆点显示，不使用姿态点菱形。
        if (isVertebraCornerKeypoint || isSacralEndplate) {
          const sc = imageToScreen(vertebra.corners[0]);
          const isActive = activeCorner?.label === vertebra.label;
          const isHovered = hoveredCorner?.label === vertebra.label;
          const isSelected = selectedKeypointIds.has(vertebra.label);
          const textFill = isActive
            ? 'rgba(255, 255, 255, 1)'
            : isHovered
              ? 'rgba(253, 224, 71, 1)'
              : isSelected
                ? 'rgba(253, 224, 71, 1)'
                : 'rgba(147, 197, 253, 1)';

          return (
            <g key={vertebra.label} className="vertebra-corner-keypoint">
              <circle
                cx={sc.x}
                cy={sc.y}
                r={isActive || isHovered || isSelected ? 5.5 : 3.5}
                fill={
                  isActive
                    ? 'rgba(239, 68, 68, 0.95)'
                    : isHovered
                      ? 'rgba(96, 165, 250, 1)'
                      : isSelected
                        ? 'rgba(250, 204, 21, 0.95)'
                        : 'rgba(59, 130, 246, 0.9)'
                }
                stroke="white"
                strokeWidth={1}
              />
              <text
                x={sc.x + 8}
                y={sc.y + 4}
                fontSize={10}
                fontWeight="600"
                fill={textFill}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {vertebra.label}
              </text>
            </g>
          );
        }

        if (vertebra.label === 'S1') {
          const s1p1 = imageToScreen(vertebra.corners[0]);
          const s1p2 = imageToScreen(vertebra.corners[1]);
          const isAnyCornerHovered = hoveredCorner?.label === vertebra.label;
          const isAnyCornerActive = activeCorner?.label === vertebra.label;
          const isAnyCornerSelected = [0, 1].some(index =>
            selectedKeypointIds.has(
              renderCornerToKeypointId(vertebra.label, index)
            )
          );
          const labelFill = isAnyCornerActive
            ? 'rgba(255, 255, 255, 1)'
            : isAnyCornerHovered
              ? 'rgba(253, 224, 71, 1)'
              : isAnyCornerSelected
                ? 'rgba(253, 224, 71, 1)'
                : 'rgba(147, 197, 253, 1)';
          const labelX = Math.max(s1p1.x, s1p2.x) + 6;
          const labelY = (s1p1.y + s1p2.y) / 2 + 4;

          return (
            <g key={vertebra.label} className="sacral-endplate-annotation">
              <line
                x1={s1p1.x}
                y1={s1p1.y}
                x2={s1p2.x}
                y2={s1p2.y}
                stroke={
                  isAnyCornerHovered || isAnyCornerActive
                    ? 'rgba(250, 204, 21, 0.95)'
                    : isAnyCornerSelected
                      ? 'rgba(250, 204, 21, 0.95)'
                      : 'rgba(59, 130, 246, 0.85)'
                }
                strokeWidth={
                  isAnyCornerHovered || isAnyCornerActive || isAnyCornerSelected
                    ? 2
                    : 1.5
                }
              />
              {[s1p1, s1p2].map((p, i) => {
                const isHovered =
                  hoveredCorner?.label === vertebra.label &&
                  hoveredCorner?.index === i;
                const isActive =
                  activeCorner?.label === vertebra.label &&
                  activeCorner?.index === i;
                const isSelected = selectedKeypointIds.has(
                  renderCornerToKeypointId(vertebra.label, i)
                );
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isHovered || isActive || isSelected ? 5.5 : 3.5}
                    fill={
                      isActive
                        ? 'rgba(239, 68, 68, 0.95)'
                        : isHovered
                          ? 'rgba(96, 165, 250, 1)'
                          : isSelected
                            ? 'rgba(250, 204, 21, 0.95)'
                            : 'rgba(59, 130, 246, 0.9)'
                    }
                    stroke="white"
                    strokeWidth={1}
                  />
                );
              })}
              <text
                x={labelX}
                y={labelY}
                textAnchor="start"
                fontSize={10}
                fontWeight="600"
                fill={labelFill}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                S1
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
        const isAnyCornerHovered = hoveredCorner?.label === vertebra.label;
        const isAnyCornerActive = activeCorner?.label === vertebra.label;
        const isAnyCornerSelected = [0, 1, 2, 3].some(index =>
          selectedKeypointIds.has(
            renderCornerToKeypointId(vertebra.label, index)
          )
        );
        const labelFill = isAnyCornerActive
          ? 'rgba(255, 255, 255, 1)'
          : isAnyCornerHovered
            ? 'rgba(253, 224, 71, 1)'
            : isAnyCornerSelected
              ? 'rgba(253, 224, 71, 1)'
              : 'rgba(147, 197, 253, 1)';

        return (
          <g key={vertebra.label} className="vertebra-annotation">
            {/* 四边形边框 */}
            <polygon
              points={polyPts}
              fill={
                isAnyCornerHovered || isAnyCornerActive
                  ? 'rgba(250, 204, 21, 0.12)'
                  : isAnyCornerSelected
                    ? 'rgba(250, 204, 21, 0.1)'
                    : 'rgba(59, 130, 246, 0.08)'
              }
              stroke={
                isAnyCornerHovered || isAnyCornerActive
                  ? 'rgba(250, 204, 21, 0.95)'
                  : isAnyCornerSelected
                    ? 'rgba(250, 204, 21, 0.95)'
                    : 'rgba(59, 130, 246, 0.85)'
              }
              strokeWidth={
                isAnyCornerHovered || isAnyCornerActive || isAnyCornerSelected
                  ? 2
                  : 1.5
              }
              strokeLinejoin="round"
            />

            {/* 4个角点小圆（仅渲染，交互由父组件的 useVertebradDrag 处理） */}
            {[tl, tr, bl, br].map((p, i) => {
              const isHovered =
                hoveredCorner?.label === vertebra.label &&
                hoveredCorner?.index === i;
              const isActive =
                activeCorner?.label === vertebra.label &&
                activeCorner?.index === i;
              const isSelected = selectedKeypointIds.has(
                renderCornerToKeypointId(vertebra.label, i)
              );
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered || isActive || isSelected ? 5.5 : 3.5}
                  fill={
                    isActive
                      ? 'rgba(239, 68, 68, 0.95)'
                      : isHovered
                        ? 'rgba(96, 165, 250, 1)'
                        : isSelected
                          ? 'rgba(250, 204, 21, 0.95)'
                          : 'rgba(59, 130, 246, 0.9)'
                  }
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
              fill={labelFill}
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
      {cfhAnnotation &&
        (() => {
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
