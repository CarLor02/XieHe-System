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
  const undoStackRef = useRef<TSnapshot[]>([]);
  const currentSnapshotRef = useRef(cloneSnapshot(snapshot));
  const pendingActionRef =
    useRef<PendingHistoryAction<TSnapshot> | null>(null);

  const pushUndoSnapshots = useCallback(
    (snapshots: TSnapshot[]) => {
      if (snapshots.length === 0) return;

      let nextStack = undoStackRef.current;
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
      });

      undoStackRef.current = nextStack;
      setUndoStack(nextStack);
    },
    [maxDepth]
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
    undoStackRef.current = [];
    setUndoStack([]);
  }, []);

  const undo = useCallback(() => {
    const snapshotToRestore =
      undoStackRef.current[undoStackRef.current.length - 1];
    if (!snapshotToRestore) return;

    pendingActionRef.current = null;
    const nextStack = undoStackRef.current.slice(0, -1);
    undoStackRef.current = nextStack;
    setUndoStack(nextStack);
    restoreSnapshot(cloneSnapshot(snapshotToRestore));
  }, [restoreSnapshot]);

  return {
    beginHistoryAction,
    cancelHistoryAction,
    clearHistory,
    undo,
    canUndo: undoStack.length > 0,
  };
}
