'use client';

import { useRef, useState, useCallback } from 'react';
import { Point, VertebraAnnotation } from '@/app/imaging/viewer/shared/types';
import {
  isSinglePointKeypointLabel,
  keypointIdToRenderCornerRef,
  renderCornerToKeypointId,
} from '@/app/imaging/viewer/features/keypoints/domain/keypoint-state';

interface DragMember {
  vertebraLabel: string;
  cornerIndex: number; // 0=TL,1=TR,2=BL,3=BR
}

type DragState =
  | ({
      mode: 'corner';
    } & DragMember)
  | {
      mode: 'group';
      members: DragMember[];
      startImagePoint: Point;
      initialLayer: VertebraAnnotation[];
    };

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
  onLiveLayerChange,
  containerRef,
  onHoverChange,
}: {
  vertebraeLayer: VertebraAnnotation[];
  /** 图像坐标 → 容器内屏幕坐标 */
  imageToScreen: (point: Point) => Point;
  /** 容器内屏幕坐标 → 图像坐标 */
  screenToImage: (screenX: number, screenY: number) => Point;
  onVertebraeUpdate?: (updated: VertebraAnnotation[]) => void;
  onLiveLayerChange?: (updated: VertebraAnnotation[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onHoverChange?: (keypointId: string | null) => void;
}) {
  // 拖拽期间实时渲染的图层（null = 不在拖拽，使用 vertebraeLayer prop）
  const [liveLayer, setLiveLayer] = useState<VertebraAnnotation[] | null>(null);
  // 当前被激活（拖拽中）的角点
  const [activeCorner, setActiveCorner] = useState<CornerRef | null>(null);
  // 当前鼠标悬停的角点
  const [hoveredCorner, setHoveredCorner] = useState<CornerRef | null>(null);
  // 拖拽元数据（不需要触发重渲染）
  const dragStateRef = useRef<DragState | null>(null);

  const updateLayerCorner = useCallback(
    (
      layer: VertebraAnnotation[],
      member: DragMember,
      imagePoint: Point
    ): VertebraAnnotation[] =>
      layer.map(v => {
        if (v.label !== member.vertebraLabel) return v;
        const newCorners = [...v.corners] as [Point, Point, Point, Point];

        if (v.label === 'S1') {
          const indices =
            member.cornerIndex === 1 || member.cornerIndex === 3
              ? [1, 3]
              : [0, 2];
          indices.forEach(index => {
            newCorners[index] = imagePoint;
          });
          return { ...v, corners: newCorners };
        }

        if (isSinglePointKeypointLabel(v.label)) {
          return {
            ...v,
            corners: [imagePoint, imagePoint, imagePoint, imagePoint],
          };
        }

        newCorners[member.cornerIndex] = imagePoint;
        return { ...v, corners: newCorners };
      }),
    []
  );

  /** 将 clientX/clientY 转换为容器相对坐标 */
  const clientToScreen = useCallback(
    (
      clientX: number,
      clientY: number
    ): { screenX: number; screenY: number } => {
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
    (screenX: number, screenY: number): DragMember | null => {
      let best: DragMember | null = null;
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
    [vertebraeLayer, imageToScreen]
  );

  const hitToKeypointId = useCallback((hit: DragMember): string => {
    return renderCornerToKeypointId(hit.vertebraLabel, hit.cornerIndex);
  }, []);

  const keypointIdsToDragMembers = useCallback(
    (keypointIds: string[]): DragMember[] => {
      const seen = new Set<string>();
      return keypointIds
        .map(keypointId =>
          keypointIdToRenderCornerRef(keypointId, vertebraeLayer)
        )
        .filter((ref): ref is CornerRef => ref !== null)
        .map(ref => ({
          vertebraLabel: ref.label,
          cornerIndex: ref.index,
        }))
        .filter(member => {
          const key = `${member.vertebraLabel}:${member.cornerIndex}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    },
    [vertebraeLayer]
  );

  /**
   * 在 div onMouseDown 中调用。
   * @returns true 表示命中角点，调用方应跳过后续 pointer.onMouseDown
   */
  const handleMouseDown = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (!onVertebraeUpdate) return false;
      const { screenX, screenY } = clientToScreen(clientX, clientY);
      const hit = findNearestCorner(screenX, screenY);
      if (!hit) return false;
      dragStateRef.current = { mode: 'corner', ...hit };
      setActiveCorner({ label: hit.vertebraLabel, index: hit.cornerIndex });
      setLiveLayer(vertebraeLayer);
      return true;
    },
    [clientToScreen, findNearestCorner, onVertebraeUpdate, vertebraeLayer]
  );

  const handleKeypointsMouseDown = useCallback(
    (keypointIds: string[], screenX: number, screenY: number): boolean => {
      if (!onVertebraeUpdate) return false;
      const members = keypointIdsToDragMembers(keypointIds);
      if (members.length === 0) return false;

      const [firstMember] = members;
      if (members.length === 1) {
        dragStateRef.current = { mode: 'corner', ...firstMember };
      } else {
        dragStateRef.current = {
          mode: 'group',
          members,
          startImagePoint: screenToImage(screenX, screenY),
          initialLayer: vertebraeLayer,
        };
      }
      setActiveCorner({
        label: firstMember.vertebraLabel,
        index: firstMember.cornerIndex,
      });
      setLiveLayer(vertebraeLayer);
      return true;
    },
    [keypointIdsToDragMembers, onVertebraeUpdate, screenToImage, vertebraeLayer]
  );

  /**
   * 在 div onMouseMove 中调用。
   * 拖拽中：更新 liveLayer（角点跟手）。
   * 未拖拽：更新 hoveredCorner（高亮悬停）。
   * @returns true 表示正在拖拽或悬停关键点，调用方可跳过 pointer.onMouseMove
   */
  const handleMouseMove = useCallback(
    (clientX: number, clientY: number): boolean => {
      const { screenX, screenY } = clientToScreen(clientX, clientY);
      const activeHit = dragStateRef.current;
      if (activeHit) {
        const imagePt = screenToImage(screenX, screenY);
        setLiveLayer(prev => {
          if (!prev) return prev;
          const next =
            activeHit.mode === 'corner'
              ? updateLayerCorner(prev, activeHit, imagePt)
              : (() => {
                  const delta = {
                    x: imagePt.x - activeHit.startImagePoint.x,
                    y: imagePt.y - activeHit.startImagePoint.y,
                  };
                  return activeHit.members.reduce((layer, member) => {
                    const source = activeHit.initialLayer.find(
                      item => item.label === member.vertebraLabel
                    );
                    const initialPoint = source?.corners[member.cornerIndex];
                    if (!initialPoint) return layer;
                    return updateLayerCorner(layer, member, {
                      x: initialPoint.x + delta.x,
                      y: initialPoint.y + delta.y,
                    });
                  }, activeHit.initialLayer);
                })();
          onLiveLayerChange?.(next);
          return next;
        });
        const activeMember =
          activeHit.mode === 'corner' ? activeHit : activeHit.members[0];
        onHoverChange?.(activeMember ? hitToKeypointId(activeMember) : null);
        return true;
      }
      // 更新悬停状态
      const hit = findNearestCorner(screenX, screenY);
      setHoveredCorner(
        hit ? { label: hit.vertebraLabel, index: hit.cornerIndex } : null
      );
      onHoverChange?.(hit ? hitToKeypointId(hit) : null);
      return hit !== null;
    },
    [
      clientToScreen,
      findNearestCorner,
      hitToKeypointId,
      onHoverChange,
      onLiveLayerChange,
      screenToImage,
      updateLayerCorner,
    ]
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

  const clearHover = useCallback(() => {
    setHoveredCorner(null);
    onHoverChange?.(null);
  }, [onHoverChange]);

  return {
    /** 渲染时使用的图层：拖拽中为实时图层，否则为 vertebraeLayer prop */
    renderLayer: liveLayer ?? vertebraeLayer,
    activeCorner,
    isDragging: dragStateRef.current !== null || activeCorner !== null,
    hoveredCorner,
    handleMouseDown,
    handleKeypointsMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearHover,
  };
}
