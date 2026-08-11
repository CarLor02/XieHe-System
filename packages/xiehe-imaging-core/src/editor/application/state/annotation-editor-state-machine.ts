import { createEmptyBindings } from '../../../bindings/domain';
import type { MeasurementData, Point } from '../../../shared/domain/contracts';
import {
  cloneAnnotationEditorSnapshot,
  type AnnotationEditorSnapshot,
} from '../../domain';

export type AnnotationEditorState = AnnotationEditorSnapshot;

export type AnnotationEditorCommand =
  | {
      type: 'replace-state';
      state: AnnotationEditorSnapshot;
      reason: 'study-load' | 'ai-measurement' | 'history-restore';
    }
  | {
      type: 'set-measurements';
      measurements: readonly MeasurementData[];
      reason: string;
    }
  | {
      type: 'set-calibration';
      standardDistance: number | null;
      standardDistanceValue: string;
      standardDistancePoints: readonly Point[];
    }
  | { type: 'clear-annotations' };

export type AnnotationEditorEffect =
  | { type: 'clear-transient-interaction' }
  | { type: 'annotation-state-changed'; reason: string };

export interface AnnotationEditorTransition {
  state: AnnotationEditorState;
  effects: readonly AnnotationEditorEffect[];
}

/**
 * 标注编辑器事实状态的纯 reducer。React 与 Expo 均通过 command 改变快照，
 * 平台层只负责执行清理临时选择等 effect，不在 reducer 中访问 UI 状态。
 */
export function reduceAnnotationEditor(
  state: AnnotationEditorState,
  command: AnnotationEditorCommand
): AnnotationEditorTransition {
  if (command.type === 'replace-state') {
    return {
      state: cloneAnnotationEditorSnapshot(command.state),
      effects: [
        { type: 'clear-transient-interaction' },
        { type: 'annotation-state-changed', reason: command.reason },
      ],
    };
  }

  if (command.type === 'set-measurements') {
    return {
      state: cloneAnnotationEditorSnapshot({
        ...state,
        measurements: [...command.measurements],
      }),
      effects: [
        { type: 'annotation-state-changed', reason: command.reason },
      ],
    };
  }

  if (command.type === 'set-calibration') {
    return {
      state: cloneAnnotationEditorSnapshot({
        ...state,
        standardDistance: command.standardDistance,
        standardDistanceValue: command.standardDistanceValue,
        standardDistancePoints: [...command.standardDistancePoints],
      }),
      effects: [{ type: 'annotation-state-changed', reason: 'calibration' }],
    };
  }

  return {
    state: cloneAnnotationEditorSnapshot({
      ...state,
      measurements: [],
      pointBindings: createEmptyBindings(),
      keypoints: [],
      vertebraeLayer: [],
      cfhAnnotation: null,
      aiMeasurementIds: [],
    }),
    effects: [
      { type: 'clear-transient-interaction' },
      { type: 'annotation-state-changed', reason: 'clear-annotations' },
    ],
  };
}
