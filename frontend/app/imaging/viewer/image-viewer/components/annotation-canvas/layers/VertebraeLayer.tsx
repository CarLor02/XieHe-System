'use client';

import { useCallback, useRef, useState } from 'react';
import { CfhAnnotation, Point, VertebraAnnotation } from '../../../types';

interface VertebraeLayerProps {
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  /** 将图像坐标系的点转换为屏幕(SVG)坐标系 */
  imageToScreen: (point: Point) => Point;
  /** 将屏幕(SVG)坐标系的点转换为图像坐标系 */
  screenToImage: (point: Point) => Point;
  /** 角点拖拽结束时回调，传出更新后的整个 vertebraeLayer */
  onVertebraeUpdate?: (updated: VertebraAnnotation[]) => void;
}

interface DragState {
  vertebraLabel: string;
  cornerIndex: number; // 0=TL,1=TR,2=BL,3=BR
}

/**
 * 椎体标注层渲染组件（SVG 内使用）。
 * corners 顺序: [TL, TR, BL, BR]
 * 支持角点拖拽：拖拽结束后调用 onVertebraeUpdate。
 */
export default function VertebraeLayer({
  vertebraeLayer,
  cfhAnnotation,
  imageToScreen,
  screenToImage,
  onVertebraeUpdate,
}: VertebraeLayerProps) {
  const [hoveredCorner, setHoveredCorner] = useState<{ label: string; index: number } | null>(null);
  const [activeCorner, setActiveCorner] = useState<DragState | null>(null);

  // liveLayer：拖拽过程中的实时图层（触发重渲染，让角点跟手）
  // dragStateRef：只存拖拽元数据，不需要重渲染
  const [liveLayer, setLiveLayer] = useState<VertebraAnnotation[] | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const handleCornerPointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, label: string, cornerIndex: number) => {
      if (!onVertebraeUpdate) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const drag: DragState = { vertebraLabel: label, cornerIndex };
      dragStateRef.current = drag;
      setActiveCorner(drag);
      setLiveLayer(vertebraeLayer); // 初始化 liveLayer 为当前图层
    },
    [vertebraeLayer, onVertebraeUpdate]
  );

  const handleCornerPointerMove = useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      if (!dragStateRef.current) return;
      e.stopPropagation();

      const svgEl = e.currentTarget.ownerSVGElement;
      if (!svgEl) return;

      const svgRect = svgEl.getBoundingClientRect();
      const screenPt: Point = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top };
      const imagePt = screenToImage(screenPt);

      const { vertebraLabel, cornerIndex } = dragStateRef.current;
      // 更新 state → 触发重渲染 → 角点跟手
      setLiveLayer(prev => {
        if (!prev) return prev;
        return prev.map(v => {
          if (v.label !== vertebraLabel) return v;
          const newCorners = [...v.corners] as [Point, Point, Point, Point];
          newCorners[cornerIndex] = imagePt;
          return { ...v, corners: newCorners };
        });
      });
    },
    [screenToImage]
  );

  const handleCornerPointerUp = useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      if (!dragStateRef.current || !onVertebraeUpdate) return;
      e.stopPropagation();

      // 用 functional updater 拿到最新 liveLayer 再回调
      setLiveLayer(prev => {
        if (prev) onVertebraeUpdate(prev);
        return null; // 清除 liveLayer，后续由 vertebraeLayer prop 驱动
      });
      dragStateRef.current = null;
      setActiveCorner(null);
    },
    [onVertebraeUpdate]
  );

  // 拖拽中用 liveLayer（实时跟手），否则用 props 传入的 vertebraeLayer
  const renderLayer = liveLayer ?? vertebraeLayer;

  return (
    <g className="vertebrae-layer">
      {renderLayer.map(vertebra => {
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

            {/* 4个角点小圆（支持拖拽） */}
            {[tl, tr, bl, br].map((p, i) => {
              const isHovered = hoveredCorner?.label === vertebra.label && hoveredCorner?.index === i;
              const isActive = activeCorner?.vertebraLabel === vertebra.label && activeCorner?.cornerIndex === i;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered || isActive ? 5.5 : 3.5}
                  fill={isActive ? 'rgba(239, 68, 68, 0.95)' : isHovered ? 'rgba(96, 165, 250, 1)' : 'rgba(59, 130, 246, 0.9)'}
                  stroke="white"
                  strokeWidth={1}
                  style={{ cursor: onVertebraeUpdate ? 'crosshair' : 'default' }}
                  onPointerEnter={() => setHoveredCorner({ label: vertebra.label, index: i })}
                  onPointerLeave={() => setHoveredCorner(null)}
                  onPointerDown={e => handleCornerPointerDown(e, vertebra.label, i)}
                  onPointerMove={handleCornerPointerMove}
                  onPointerUp={handleCornerPointerUp}
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
