import type { Point } from '../../../shared/domain/contracts';

export type AnnotationInteractionOwner =
  | 'vertebra'
  | 'canvas'
  | 'manual-binding'
  | 'standard-distance'
  | 'measurement'
  | 'drawing'
  | 'viewport';

export type AnnotationInteractionState =
  | { phase: 'idle' }
  | {
      phase: 'pressed' | 'dragging';
      pointerId: number;
      owner: AnnotationInteractionOwner;
      startPoint: Point;
      currentPoint: Point;
    };

export type AnnotationInteractionCommand =
  | {
      type: 'begin';
      pointerId: number;
      owner: AnnotationInteractionOwner;
      point: Point;
    }
  | {
      type: 'move';
      pointerId: number;
      point: Point;
      primaryActionPressed: boolean;
      dragStartThreshold: number;
    }
  | { type: 'end'; pointerId: number }
  | { type: 'cancel' };

export type AnnotationInteractionEffect =
  | { type: 'hover'; point: Point }
  | {
      type: 'route-move';
      owner: AnnotationInteractionOwner;
      point: Point;
      dragStarted: boolean;
    }
  | {
      type: 'route-end';
      owner: AnnotationInteractionOwner;
      didDrag: boolean;
    }
  | { type: 'route-cancel'; owner: AnnotationInteractionOwner };

export interface AnnotationInteractionTransition {
  state: AnnotationInteractionState;
  effects: readonly AnnotationInteractionEffect[];
}

export const IDLE_ANNOTATION_INTERACTION: AnnotationInteractionState = {
  phase: 'idle',
};

/**
 * 跨 Web/Expo 的单指交互状态机。平台层只负责命中测试并选择 owner；
 * 一旦按下，后续 move/end 必须路由给同一 owner，避免工具、椎体和视口
 * 在一次手势中互相抢占。
 */
export function transitionAnnotationInteraction(
  state: AnnotationInteractionState,
  command: AnnotationInteractionCommand
): AnnotationInteractionTransition {
  if (command.type === 'cancel') {
    return state.phase === 'idle'
      ? { state, effects: [] }
      : {
          state: IDLE_ANNOTATION_INTERACTION,
          effects: [{ type: 'route-cancel', owner: state.owner }],
        };
  }

  if (command.type === 'begin') {
    if (state.phase !== 'idle') return { state, effects: [] };
    return {
      state: {
        phase: 'pressed',
        pointerId: command.pointerId,
        owner: command.owner,
        startPoint: command.point,
        currentPoint: command.point,
      },
      effects: [],
    };
  }

  if (command.type === 'move') {
    if (state.phase === 'idle') {
      return {
        state,
        effects: command.primaryActionPressed
          ? []
          : [{ type: 'hover', point: command.point }],
      };
    }
    if (state.pointerId !== command.pointerId) return { state, effects: [] };
    const dragStarted =
      state.phase === 'dragging' ||
      Math.hypot(
        command.point.x - state.startPoint.x,
        command.point.y - state.startPoint.y
      ) > command.dragStartThreshold;
    const nextState: AnnotationInteractionState = {
      ...state,
      phase: dragStarted ? 'dragging' : 'pressed',
      currentPoint: command.point,
    };
    return {
      state: nextState,
      effects: command.primaryActionPressed
        ? [
            {
              type: 'route-move',
              owner: state.owner,
              point: command.point,
              dragStarted,
            },
          ]
        : [],
    };
  }

  if (state.phase === 'idle' || state.pointerId !== command.pointerId) {
    return { state, effects: [] };
  }
  return {
    state: IDLE_ANNOTATION_INTERACTION,
    effects: [
      {
        type: 'route-end',
        owner: state.owner,
        didDrag: state.phase === 'dragging',
      },
    ],
  };
}
