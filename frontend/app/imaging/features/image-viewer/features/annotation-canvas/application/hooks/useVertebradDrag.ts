'use client';

import { useRef, useState, useCallback } from 'react';
import {
  Point,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import {
  renderCornerToKeypointId,
} from '@xiehe/imaging-core/keypoints';
import {
  findNearestVertebraCorner,
  findVertebraFrameMembers,
  keypointIdsToVertebraDragMembers,
  shouldStartPointerDrag,
  updateVertebraLayerCorner,
  type VertebraDragMember as DragMember,
} from '@xiehe/imaging-core/canvas';

type DragState =
  | ({
      mode: 'corner';
      startScreenPoint: ScreenPoint;
      dragStarted: boolean;
      dragStartThreshold: number;
    } & DragMember)
  | {
      mode: 'group';
      members: DragMember[];
      startScreenPoint: ScreenPoint;
      startImagePoint: Point;
      initialLayer: VertebraAnnotation[];
      dragStarted: boolean;
      dragStartThreshold: number;
    };

interface CornerRef {
  label: string;
  index: number;
}

export type VertebradDragSelection =
  | { kind: 'keypoint'; keypointId: string }
  | { kind: 'vertebra'; vertebraLabel: string };

interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * 在 canvas div 层实现椎体角点的命中检测与拖拽交互。
 *
 * 不依赖 SVG pointer-events，直接使用 clientX/clientY 与容器 getBoundingClientRect
 * 做命中测试，彻底解决 SVG pointer-events-none 导致圆圈无法接收事件的问题。
 *
 * 使用方通过统一 Pointer Events 适配器调用本 hook 返回的交互方法。
 */
export function useVertebradDrag({
  vertebraeLayer,
  imageToScreen,
  screenToImage,
  onVertebraeUpdate,
  onLiveLayerChange,
  containerRef,
  onHoverChange,
  onSelectionChange,
  onAnnotationDragStart,
  enableFrameHitTest = true,
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
  onSelectionChange?: (selection: VertebradDragSelection) => void;
  onAnnotationDragStart?: () => void;
  enableFrameHitTest?: boolean;
}) {
  // 拖拽期间实时渲染的图层（null = 不在拖拽，使用 vertebraeLayer prop）
  const [liveLayer, setLiveLayer] = useState<VertebraAnnotation[] | null>(null);
  // 当前被激活（拖拽中）的角点
  const [activeCorner, setActiveCorner] = useState<CornerRef | null>(null);
  // 当前支持 hover 的指针悬停角点
  const [hoveredCorner, setHoveredCorner] = useState<CornerRef | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽元数据（不需要触发重渲染）
  const dragStateRef = useRef<DragState | null>(null);
  // 当前拖拽中的图层快照。用于在事件处理阶段同步计算和通知父层，
  // 避免在 React state updater 内触发 measurements 等父层状态更新。
  const liveLayerRef = useRef<VertebraAnnotation[] | null>(null);

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
   * 在当前 vertebraeLayer 中查找距屏幕点最近且在命中半径内的角点。
   * 使用 imageToScreen 将图像坐标转为屏幕坐标后比较。
   */
  const findNearestCorner = useCallback(
    (
      screenX: number,
      screenY: number,
      hitRadius: number
    ): DragMember | null => {
      return findNearestVertebraCorner({
        layer: vertebraeLayer,
        screenPoint: { x: screenX, y: screenY },
        hitRadius,
        imageToScreen,
      });
    },
    [vertebraeLayer, imageToScreen]
  );

  const findFrameInterior = useCallback(
    (screenX: number, screenY: number): DragMember[] | null => {
      return findVertebraFrameMembers({
        layer: vertebraeLayer,
        screenPoint: { x: screenX, y: screenY },
        imageToScreen,
      });
    },
    [imageToScreen, vertebraeLayer]
  );

  const hitToKeypointId = useCallback((hit: DragMember): string => {
    return renderCornerToKeypointId(hit.vertebraLabel, hit.cornerIndex);
  }, []);

  const keypointIdsToDragMembers = useCallback(
    (keypointIds: string[]): DragMember[] =>
      keypointIdsToVertebraDragMembers({
        keypointIds,
        layer: vertebraeLayer,
      }),
    [vertebraeLayer]
  );

  /**
   * Pointer down 时调用。点位优先于完整椎体框命中。
   */
  const beginInteraction = useCallback(
    (
      clientX: number,
      clientY: number,
      hitRadius: number,
      dragStartThreshold: number
    ): boolean => {
      if (!onVertebraeUpdate) return false;
      const { screenX, screenY } = clientToScreen(clientX, clientY);
      const hit = findNearestCorner(screenX, screenY, hitRadius);
      if (hit) {
        onSelectionChange?.({
          kind: 'keypoint',
          keypointId: hitToKeypointId(hit),
        });
        dragStateRef.current = {
          mode: 'corner',
          ...hit,
          startScreenPoint: { x: screenX, y: screenY },
          dragStarted: false,
          dragStartThreshold,
        };
        setActiveCorner({ label: hit.vertebraLabel, index: hit.cornerIndex });
        return true;
      }

      const members = enableFrameHitTest
        ? findFrameInterior(screenX, screenY)
        : null;
      if (!members) return false;

      const [firstMember] = members;
      onSelectionChange?.({
        kind: 'vertebra',
        vertebraLabel: firstMember.vertebraLabel,
      });
      dragStateRef.current = {
        mode: 'group',
        members,
        startScreenPoint: { x: screenX, y: screenY },
        startImagePoint: screenToImage(screenX, screenY),
        initialLayer: vertebraeLayer,
        dragStarted: false,
        dragStartThreshold,
      };
      setActiveCorner({
        label: firstMember.vertebraLabel,
        index: firstMember.cornerIndex,
      });
      return true;
    },
    [
      clientToScreen,
      findFrameInterior,
      findNearestCorner,
      enableFrameHitTest,
      hitToKeypointId,
      onSelectionChange,
      onVertebraeUpdate,
      screenToImage,
      vertebraeLayer,
    ]
  );

  const beginBoundKeypointInteraction = useCallback(
    (keypointIds: string[], screenX: number, screenY: number): boolean => {
      if (!onVertebraeUpdate) return false;
      const members = keypointIdsToDragMembers(keypointIds);
      if (members.length === 0) return false;

      onAnnotationDragStart?.();
      const [firstMember] = members;
      if (members.length === 1) {
        dragStateRef.current = {
          mode: 'corner',
          ...firstMember,
          startScreenPoint: { x: screenX, y: screenY },
          dragStarted: true,
          dragStartThreshold: 0,
        };
      } else {
        dragStateRef.current = {
          mode: 'group',
          members,
          startScreenPoint: { x: screenX, y: screenY },
          startImagePoint: screenToImage(screenX, screenY),
          initialLayer: vertebraeLayer,
          dragStarted: true,
          dragStartThreshold: 0,
        };
      }
      setActiveCorner({
        label: firstMember.vertebraLabel,
        index: firstMember.cornerIndex,
      });
      setIsDragging(true);
      liveLayerRef.current = vertebraeLayer;
      setLiveLayer(vertebraeLayer);
      return true;
    },
    [
      keypointIdsToDragMembers,
      onAnnotationDragStart,
      onVertebraeUpdate,
      screenToImage,
      vertebraeLayer,
    ]
  );

  const clearHover = useCallback(() => {
    setHoveredCorner(null);
    onHoverChange?.(null);
  }, [onHoverChange]);

  /**
   * Pointer move 时调用。
   * 拖拽中：更新 liveLayer（角点跟手）。
   * 未拖拽：更新 hoveredCorner（高亮悬停）。
   * @returns true 表示正在拖拽或悬停关键点，调用方应停止后续 measurement 分发
   */
  const updateInteraction = useCallback(
    (
      clientX: number,
      clientY: number,
      supportsHover: boolean,
      hitRadius: number
    ): boolean => {
      const { screenX, screenY } = clientToScreen(clientX, clientY);
      const activeHit = dragStateRef.current;
      if (activeHit) {
        const currentScreenPoint = { x: screenX, y: screenY };
        if (!activeHit.dragStarted) {
          if (
            !shouldStartPointerDrag(
              activeHit.startScreenPoint,
              currentScreenPoint,
              activeHit.dragStartThreshold
            )
          ) {
            return true;
          }
          onAnnotationDragStart?.();
          activeHit.dragStarted = true;
          liveLayerRef.current = vertebraeLayer;
          setLiveLayer(vertebraeLayer);
          setIsDragging(true);
        }

        const imagePt = screenToImage(screenX, screenY);
        const currentLayer = liveLayerRef.current ?? vertebraeLayer;
        const next =
          activeHit.mode === 'corner'
            ? updateVertebraLayerCorner(currentLayer, activeHit, imagePt)
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
                  return updateVertebraLayerCorner(layer, member, {
                    x: initialPoint.x + delta.x,
                    y: initialPoint.y + delta.y,
                  });
                }, activeHit.initialLayer);
              })();
        liveLayerRef.current = next;
        setLiveLayer(next);
        onLiveLayerChange?.(next);
        const activeMember =
          activeHit.mode === 'corner' ? activeHit : activeHit.members[0];
        onHoverChange?.(activeMember ? hitToKeypointId(activeMember) : null);
        return true;
      }
      if (!supportsHover) {
        clearHover();
        return false;
      }

      // 触摸不模拟 hover；鼠标与支持悬停的触摸笔才更新此状态。
      const hit = findNearestCorner(screenX, screenY, hitRadius);
      setHoveredCorner(
        hit ? { label: hit.vertebraLabel, index: hit.cornerIndex } : null
      );
      onHoverChange?.(hit ? hitToKeypointId(hit) : null);
      return hit !== null;
    },
    [
      clientToScreen,
      clearHover,
      findNearestCorner,
      hitToKeypointId,
      onHoverChange,
      onAnnotationDragStart,
      onLiveLayerChange,
      screenToImage,
      vertebraeLayer,
    ]
  );

  /**
   * Pointer up/cancel/lost capture 时调用。
   * 结束拖拽，把最终 liveLayer 传给 onVertebraeUpdate。
   */
  const endInteraction = useCallback(() => {
    const activeHit = dragStateRef.current;
    if (!activeHit) return;
    const finalLayer = liveLayerRef.current;
    dragStateRef.current = null;
    liveLayerRef.current = null;
    setLiveLayer(null);
    if (activeHit.dragStarted && finalLayer && onVertebraeUpdate) {
      onVertebraeUpdate(finalLayer);
    }
    setActiveCorner(null);
    setIsDragging(false);
  }, [onVertebraeUpdate]);

  const cancelPendingInteraction = useCallback(() => {
    const activeHit = dragStateRef.current;
    if (!activeHit || activeHit.dragStarted) return false;

    dragStateRef.current = null;
    liveLayerRef.current = null;
    setLiveLayer(null);
    setActiveCorner(null);
    setIsDragging(false);
    return true;
  }, []);

  const hasStartedInteraction = useCallback(
    () => Boolean(dragStateRef.current?.dragStarted),
    []
  );

  return {
    /** 渲染时使用的图层：拖拽中为实时图层，否则为 vertebraeLayer prop */
    renderLayer: liveLayer ?? vertebraeLayer,
    activeCorner,
    isDragging,
    hoveredCorner,
    beginInteraction,
    beginBoundKeypointInteraction,
    updateInteraction,
    endInteraction,
    cancelPendingInteraction,
    hasStartedInteraction,
    clearHover,
  };
}
