import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAnnotationHistoryOptions<TSnapshot> {
  snapshot: TSnapshot;
  restoreSnapshot: (snapshot: TSnapshot) => void;
  maxDepth?: number;
}

interface BeginHistoryActionOptions {
  persistAcrossUnchangedRenders?: boolean;
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
  const currentSnapshotRef = useRef(cloneSnapshot(snapshot));
  const pendingActionRef =
    useRef<PendingHistoryAction<TSnapshot> | null>(null);

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
    setUndoStack(previous => {
      const next = [...previous, cloneSnapshot(pendingAction.snapshot)];
      return next.slice(Math.max(0, next.length - maxDepth));
    });
  }, [maxDepth, snapshot]);

  const beginHistoryAction = useCallback(
    (label: string, options: BeginHistoryActionOptions = {}) => {
      const pendingAction = {
        label,
        snapshot: cloneSnapshot(currentSnapshotRef.current),
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
    []
  );

  const cancelHistoryAction = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  const clearHistory = useCallback(() => {
    pendingActionRef.current = null;
    setUndoStack([]);
  }, []);

  const undo = useCallback(() => {
    const snapshotToRestore = undoStack[undoStack.length - 1];
    if (!snapshotToRestore) return;

    pendingActionRef.current = null;
    setUndoStack(previous => previous.slice(0, -1));
    restoreSnapshot(cloneSnapshot(snapshotToRestore));
  }, [restoreSnapshot, undoStack]);

  return {
    beginHistoryAction,
    cancelHistoryAction,
    clearHistory,
    undo,
    canUndo: undoStack.length > 0,
  };
}
