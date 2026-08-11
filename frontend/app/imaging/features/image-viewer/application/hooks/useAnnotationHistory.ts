import {
  beginAnnotationHistoryAction,
  cancelAnnotationHistoryAction,
  clearAnnotationHistory,
  createAnnotationHistoryState,
  observeAnnotationHistoryPresent,
  redoAnnotationHistory,
  undoAnnotationHistory,
  type AnnotationHistoryPolicy,
  type AnnotationHistoryState,
} from '@xiehe/imaging-core/editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseAnnotationHistoryOptions<TSnapshot> {
  snapshot: TSnapshot;
  restoreSnapshot: (snapshot: TSnapshot) => void;
  cloneSnapshot: (snapshot: TSnapshot) => TSnapshot;
  snapshotsEqual: (left: TSnapshot, right: TSnapshot) => boolean;
  maxDepth?: number;
}

interface BeginHistoryActionOptions<TSnapshot> {
  persistAcrossUnchangedRenders?: boolean;
  commitImmediately?: boolean;
  snapshot?: TSnapshot;
}

export function useAnnotationHistory<TSnapshot>({
  snapshot,
  restoreSnapshot,
  cloneSnapshot,
  snapshotsEqual,
  maxDepth = 50,
}: UseAnnotationHistoryOptions<TSnapshot>) {
  const policy = useMemo<AnnotationHistoryPolicy<TSnapshot>>(
    () => ({ clone: cloneSnapshot, equals: snapshotsEqual, maxDepth }),
    [cloneSnapshot, maxDepth, snapshotsEqual]
  );
  const currentSnapshotRef = useRef(cloneSnapshot(snapshot));
  const [historyState, setHistoryState] = useState(() =>
    createAnnotationHistoryState(snapshot, policy)
  );
  const historyStateRef = useRef(historyState);
  const actionIdRef = useRef(0);

  const replaceHistoryState = useCallback(
    (next: AnnotationHistoryState<TSnapshot>) => {
      historyStateRef.current = next;
      setHistoryState(next);
    },
    []
  );

  useEffect(() => {
    const currentSnapshot = policy.clone(snapshot);
    currentSnapshotRef.current = currentSnapshot;
    replaceHistoryState(
      observeAnnotationHistoryPresent(
        historyStateRef.current,
        currentSnapshot,
        policy
      )
    );
  }, [policy, replaceHistoryState, snapshot]);

  const beginHistoryAction = useCallback(
    (
      label: string,
      options: BeginHistoryActionOptions<TSnapshot> = {}
    ) => {
      const currentSnapshot = policy.clone(
        options.snapshot ?? currentSnapshotRef.current
      );
      const actionId = (actionIdRef.current += 1);
      replaceHistoryState(
        beginAnnotationHistoryAction(
          historyStateRef.current,
          label,
          { ...options, id: actionId, snapshot: currentSnapshot },
          policy
        )
      );

      if (!options.commitImmediately && !options.persistAcrossUnchangedRenders) {
        setTimeout(() => {
          replaceHistoryState(
            cancelAnnotationHistoryAction(historyStateRef.current, actionId)
          );
        }, 0);
      }
    },
    [policy, replaceHistoryState]
  );

  const cancelHistoryAction = useCallback(() => {
    replaceHistoryState(cancelAnnotationHistoryAction(historyStateRef.current));
  }, [replaceHistoryState]);

  const clearHistory = useCallback(() => {
    replaceHistoryState(
      clearAnnotationHistory(
        historyStateRef.current,
        currentSnapshotRef.current,
        policy
      )
    );
  }, [policy, replaceHistoryState]);

  const undo = useCallback(() => {
    const result = undoAnnotationHistory(historyStateRef.current, policy);
    const restoredSnapshot = result.snapshotToRestore;
    if (!restoredSnapshot) return;
    replaceHistoryState(result.state);
    currentSnapshotRef.current = restoredSnapshot;
    restoreSnapshot(restoredSnapshot);
  }, [policy, replaceHistoryState, restoreSnapshot]);

  const redo = useCallback(() => {
    const result = redoAnnotationHistory(historyStateRef.current, policy);
    const restoredSnapshot = result.snapshotToRestore;
    if (!restoredSnapshot) return;
    replaceHistoryState(result.state);
    currentSnapshotRef.current = restoredSnapshot;
    restoreSnapshot(restoredSnapshot);
  }, [policy, replaceHistoryState, restoreSnapshot]);

  return {
    beginHistoryAction,
    cancelHistoryAction,
    clearHistory,
    undo,
    redo,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
  };
}
