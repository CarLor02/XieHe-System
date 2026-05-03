'use client';

import { useRef, useState, useCallback } from 'react';
import { Point, VertebraAnnotation } from '../../../types';

interface DragState {
  vertebraLabel: string;
  cornerIndex: number; // 0=TL,1=TR,2=BL,3=BR
}

interface CornerRef {
  label: string;
  index: number;
}

/** 命中检测半径（屏幕像素） */
const HIT_RADIUS_PX = 10;

/**
 * 在 canvas div 层实现椎体角点的命中检测与拖拽交互。
 *
 * 不依赖 SVG pointer-events，直接使用 clientX/clientY 与容器 getBoundingClientRect
 * 做命中测试，彻底解决 SVG pointer-events-none 导致圆圈无法接收事件的问题。
 *
 * 使用方：AnnotationCanvas 在 onMouseDown/Move/Up 中调用本 hook 返回的 handlers。
 */
export function useVertebradDrag({
  vertebraeLayer,
  imageToScreen,
  screenToImage,
  onVertebraeUpdate,
  containerRef,
}: {
  vertebraeLayer: VertebraAnnotation[];
  /** 图像坐标 → 容器内屏幕坐标 */
  imageToScreen: (point: Point) => Point;
  /** 容器内屏幕坐标 → 图像坐标 */
  screenToImage: (screenX: number, screenY: number) => Point;
  onVertebraeUpdate?: (updated: VertebraAnnotation[]) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  // 拖拽期间实时渲染的图层（null = 不在拖拽，使用 vertebraeLayer prop）
  const [liveLayer, setLiveLayer] = useState<VertebraAnnotation[] | null>(null);
  // 当前被激活（拖拽中）的角点
  const [activeCorner, setActiveCorner] = useState<CornerRef | null>(null);
  // 当前鼠标悬停的角点
  const [hoveredCorner, setHoveredCorner] = useState<CornerRef | null>(null);
  // 拖拽元数据（不需要触发重渲染）
  const dragStateRef = useRef<DragState | null>(null);

  /** 将 clientX/clientY 转换为容器相对坐标 */
  const clientToScreen = useCallback(
    (clientX: number, clientY: number): { screenX: number; screenY: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      return {
        screenX: clientX - (rect?.left ?? 0),
        screenY: clientY - (rect?.top ?? 0),
      };
    },
    [containerRef]
  );

  /**
   * 在当前 vertebraeLayer 中查找距屏幕点最近且在 HIT_RADIUS_PX 内的角点。
   * 使用 imageToScreen 将图像坐标转为屏幕坐标后比较。
   */
  const findNearestCorner = useCallback(
    (screenX: number, screenY: number): DragState | null => {
      if (!onVertebraeUpdate) return null;
      let best: DragState | null = null;
      let bestDist = HIT_RADIUS_PX;
      for (const vertebra of vertebraeLayer) {
        vertebra.corners.forEach((corner, i) => {
          const sc = imageToScreen(corner);
          const dist = Math.hypot(sc.x - screenX, sc.y - screenY);
          if (dist < bestDist) {
            bestDist = dist;
            best = { vertebraLabel: vertebra.label, cornerIndex: i };
          }
        });
      }
      return best;
    },
    [vertebraeLayer, imageToScreen, onVertebraeUpdate]
  );

  /**
   * 在 div onMouseDown 中调用。
   * @returns true 表示命中角点，调用方应跳过后续 pointer.onMouseDown
   */
  const handleMouseDown = useCallback(
    (clientX: number, clientY: number): boolean => {
      const { screenX, screenY } = clientToScreen(clientX, clientY);
      const hit = findNearestCorner(screenX, screenY);
      if (!hit) return false;
      dragStateRef.current = hit;
      setActiveCorner({ label: hit.vertebraLabel, index: hit.cornerIndex });
      setLiveLayer(vertebraeLayer);
      return true;
    },
    [clientToScreen, findNearestCorner, vertebraeLayer]
  );

  /**
   * 在 div onMouseMove 中调用。
   * 拖拽中：更新 liveLayer（角点跟手）。
   * 未拖拽：更新 hoveredCorner（高亮悬停）。
   * @returns true 表示正在拖拽角点，调用方可选择跳过 pointer.onMouseMove
   */
  const handleMouseMove = useCallback(
    (clientX: number, clientY: number): boolean => {
      const { screenX, screenY } = clientToScreen(clientX, clientY);
      if (dragStateRef.current) {
        const imagePt = screenToImage(screenX, screenY);
        const { vertebraLabel, cornerIndex } = dragStateRef.current;
        setLiveLayer(prev => {
          if (!prev) return prev;
          return prev.map(v => {
            if (v.label !== vertebraLabel) return v;
            const newCorners = [...v.corners] as [Point, Point, Point, Point];
            newCorners[cornerIndex] = imagePt;
            return { ...v, corners: newCorners };
          });
        });
        return true;
      }
      // 更新悬停状态
      const hit = findNearestCorner(screenX, screenY);
      setHoveredCorner(hit ? { label: hit.vertebraLabel, index: hit.cornerIndex } : null);
      return false;
    },
    [clientToScreen, findNearestCorner, screenToImage]
  );

  /**
   * 在 div onMouseUp / onMouseLeave 中调用。
   * 结束拖拽，把最终 liveLayer 传给 onVertebraeUpdate。
   */
  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    setLiveLayer(prev => {
      if (prev && onVertebraeUpdate) onVertebraeUpdate(prev);
      return null;
    });
    setActiveCorner(null);
  }, [onVertebraeUpdate]);

  return {
    /** 渲染时使用的图层：拖拽中为实时图层，否则为 vertebraeLayer prop */
    renderLayer: liveLayer ?? vertebraeLayer,
    activeCorner,
    hoveredCorner,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
