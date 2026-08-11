import { describe, expect, it } from 'vitest';

import {
  beginAnnotationHistoryAction,
  cancelAnnotationHistoryAction,
  createAnnotationHistoryState,
  observeAnnotationHistoryPresent,
  redoAnnotationHistory,
  undoAnnotationHistory,
  type AnnotationHistoryPolicy,
} from './annotation-history';

interface Snapshot {
  count: number;
}

const policy: AnnotationHistoryPolicy<Snapshot> = {
  clone: snapshot => ({ ...snapshot }),
  equals: (left, right) => left.count === right.count,
  maxDepth: 2,
};

describe('annotation history', () => {
  it('records changed actions and supports undo and redo', () => {
    let state = createAnnotationHistoryState({ count: 0 }, policy);
    state = beginAnnotationHistoryAction(
      state,
      'change',
      { id: 1 },
      policy
    );
    state = observeAnnotationHistoryPresent(state, { count: 1 }, policy);

    const undone = undoAnnotationHistory(state, policy);
    expect(undone.snapshotToRestore).toEqual({ count: 0 });
    expect(undone.state.future).toEqual([{ count: 1 }]);

    const redone = redoAnnotationHistory(undone.state, policy);
    expect(redone.snapshotToRestore).toEqual({ count: 1 });
    expect(redone.state.future).toEqual([]);
  });

  it('does not record unchanged actions and can expire one pending action', () => {
    let state = createAnnotationHistoryState({ count: 0 }, policy);
    state = beginAnnotationHistoryAction(
      state,
      'unchanged',
      { id: 7 },
      policy
    );
    state = observeAnnotationHistoryPresent(state, { count: 0 }, policy);
    expect(state.past).toEqual([]);
    expect(state.pendingAction).toBeNull();

    state = beginAnnotationHistoryAction(
      state,
      'later',
      { id: 8, persistAcrossUnchangedRenders: true },
      policy
    );
    expect(cancelAnnotationHistoryAction(state, 7)).toBe(state);
    expect(cancelAnnotationHistoryAction(state, 8).pendingAction).toBeNull();
  });

  it('caps the past stack and clears future after a new change', () => {
    let state = createAnnotationHistoryState({ count: 0 }, policy);
    for (let count = 1; count <= 3; count += 1) {
      state = beginAnnotationHistoryAction(
        state,
        `change-${count}`,
        { id: count },
        policy
      );
      state = observeAnnotationHistoryPresent(state, { count }, policy);
    }
    expect(state.past).toEqual([{ count: 1 }, { count: 2 }]);

    state = undoAnnotationHistory(state, policy).state;
    state = beginAnnotationHistoryAction(
      state,
      'replacement',
      { id: 9 },
      policy
    );
    state = observeAnnotationHistoryPresent(state, { count: 8 }, policy);
    expect(state.future).toEqual([]);
  });
});
