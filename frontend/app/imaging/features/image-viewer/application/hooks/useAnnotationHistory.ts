import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAnnotationHistoryOptions<TSnapshot> {
  snapshot: TSnapshot;
  restoreSnapshot: (snapshot: TSnapshot) => void;
  maxDepth?: number;
}

interface BeginHistoryActionOptions<TSnapshot> {
  persistAcrossUnchangedRenders?: boolean;
  commitImmediately?: boolean;
  snapshot?: TSnapshot;
}

interface PendingHistoryAction<TSnapshot> {
  label: string;
  snapshot: TSnapshot;
  persistAcrossUnchangedRenders: boolean;
}

function cloneSnapshot<TSnapshot>(snapshot: TSnapshot): TSnapshot {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot)) as TSnapshot;
}

function snapshotsEqual<TSnapshot>(
  left: TSnapshot,
  right: TSnapshot
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useAnnotationHistory<TSnapshot>({
  snapshot,
  restoreSnapshot,
  maxDepth = 50,
}: UseAnnotationHistoryOptions<TSnapshot>) {
  const [undoStack, setUndoStack] = useState<TSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<TSnapshot[]>([]);
  const undoStackRef = useRef<TSnapshot[]>([]);
  const redoStackRef = useRef<TSnapshot[]>([]);
  const currentSnapshotRef = useRef(cloneSnapshot(snapshot));
  const pendingActionRef =
    useRef<PendingHistoryAction<TSnapshot> | null>(null);

  const setUndoSnapshots = useCallback((snapshots: TSnapshot[]) => {
    undoStackRef.current = snapshots;
    setUndoStack(snapshots);
  }, []);

  const setRedoSnapshots = useCallback((snapshots: TSnapshot[]) => {
    redoStackRef.current = snapshots;
    setRedoStack(snapshots);
  }, []);

  const appendSnapshots = useCallback(
    (stack: TSnapshot[], snapshots: TSnapshot[]) => {
      let nextStack = stack;
      let didAppend = false;
      snapshots.forEach(snapshotToPush => {
        const clonedSnapshot = cloneSnapshot(snapshotToPush);
        const previousSnapshot = nextStack[nextStack.length - 1];
        if (
          previousSnapshot &&
          snapshotsEqual(previousSnapshot, clonedSnapshot)
        ) {
          return;
        }

        nextStack = [...nextStack, clonedSnapshot].slice(
          Math.max(0, nextStack.length + 1 - maxDepth)
        );
        didAppend = true;
      });

      return { nextStack, didAppend };
    },
    [maxDepth]
  );

  const pushUndoSnapshots = useCallback(
    (
      snapshots: TSnapshot[],
      options: { clearRedo?: boolean } = {}
    ) => {
      if (snapshots.length === 0) return;

      const { nextStack, didAppend } = appendSnapshots(
        undoStackRef.current,
        snapshots
      );
      if (!didAppend) return;

      setUndoSnapshots(nextStack);
      if (options.clearRedo ?? true) {
        setRedoSnapshots([]);
      }
    },
    [appendSnapshots, setRedoSnapshots, setUndoSnapshots]
  );

  const pushRedoSnapshot = useCallback(
    (snapshotToPush: TSnapshot) => {
      const { nextStack, didAppend } = appendSnapshots(redoStackRef.current, [
        snapshotToPush,
      ]);
      if (!didAppend) return;

      setRedoSnapshots(nextStack);
    },
    [appendSnapshots, setRedoSnapshots]
  );

  useEffect(() => {
    const currentSnapshot = cloneSnapshot(snapshot);
    currentSnapshotRef.current = currentSnapshot;

    const pendingAction = pendingActionRef.current;
    if (!pendingAction) return;
    if (snapshotsEqual(pendingAction.snapshot, currentSnapshot)) {
      if (!pendingAction.persistAcrossUnchangedRenders) {
        pendingActionRef.current = null;
      }
      return;
    }

    pendingActionRef.current = null;
    pushUndoSnapshots([pendingAction.snapshot]);
  }, [pushUndoSnapshots, snapshot]);

  const beginHistoryAction = useCallback(
    (
      label: string,
      options: BeginHistoryActionOptions<TSnapshot> = {}
    ) => {
      const currentSnapshot = cloneSnapshot(
        options.snapshot ?? currentSnapshotRef.current
      );
      const previousPendingAction = pendingActionRef.current;
      const snapshotsToFlush =
        previousPendingAction &&
        !snapshotsEqual(previousPendingAction.snapshot, currentSnapshot)
          ? [previousPendingAction.snapshot]
          : [];

      pendingActionRef.current = null;

      if (options.commitImmediately) {
        pushUndoSnapshots([...snapshotsToFlush, currentSnapshot]);
        return;
      }

      if (snapshotsToFlush.length > 0) {
        pushUndoSnapshots(snapshotsToFlush);
      }

      const pendingAction = {
        label,
        snapshot: currentSnapshot,
        persistAcrossUnchangedRenders:
          options.persistAcrossUnchangedRenders ?? false,
      };
      pendingActionRef.current = pendingAction;

      if (!pendingAction.persistAcrossUnchangedRenders) {
        setTimeout(() => {
          if (pendingActionRef.current === pendingAction) {
            pendingActionRef.current = null;
          }
        }, 0);
      }
    },
    [pushUndoSnapshots]
  );

  const cancelHistoryAction = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  const clearHistory = useCallback(() => {
    pendingActionRef.current = null;
    setUndoSnapshots([]);
    setRedoSnapshots([]);
  }, [setRedoSnapshots, setUndoSnapshots]);

  const undo = useCallback(() => {
    const snapshotToRestore =
      undoStackRef.current[undoStackRef.current.length - 1];
    if (!snapshotToRestore) return;

    const currentSnapshot = cloneSnapshot(currentSnapshotRef.current);
    pendingActionRef.current = null;
    const nextStack = undoStackRef.current.slice(0, -1);
    setUndoSnapshots(nextStack);
    pushRedoSnapshot(currentSnapshot);

    const restoredSnapshot = cloneSnapshot(snapshotToRestore);
    currentSnapshotRef.current = restoredSnapshot;
    restoreSnapshot(restoredSnapshot);
  }, [pushRedoSnapshot, restoreSnapshot, setUndoSnapshots]);

  const redo = useCallback(() => {
    const snapshotToRestore =
      redoStackRef.current[redoStackRef.current.length - 1];
    if (!snapshotToRestore) return;

    const currentSnapshot = cloneSnapshot(currentSnapshotRef.current);
    pendingActionRef.current = null;
    const nextRedoStack = redoStackRef.current.slice(0, -1);
    setRedoSnapshots(nextRedoStack);
    pushUndoSnapshots([currentSnapshot], { clearRedo: false });

    const restoredSnapshot = cloneSnapshot(snapshotToRestore);
    currentSnapshotRef.current = restoredSnapshot;
    restoreSnapshot(restoredSnapshot);
  }, [pushUndoSnapshots, restoreSnapshot, setRedoSnapshots]);

  return {
    beginHistoryAction,
    cancelHistoryAction,
    clearHistory,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
