export interface AnnotationHistoryPendingAction<TSnapshot> {
  id: number;
  label: string;
  snapshot: TSnapshot;
  persistAcrossUnchangedRenders: boolean;
}

export interface AnnotationHistoryState<TSnapshot> {
  past: TSnapshot[];
  present: TSnapshot;
  future: TSnapshot[];
  pendingAction: AnnotationHistoryPendingAction<TSnapshot> | null;
}

export interface AnnotationHistoryPolicy<TSnapshot> {
  clone: (snapshot: TSnapshot) => TSnapshot;
  equals: (left: TSnapshot, right: TSnapshot) => boolean;
  maxDepth: number;
}

export interface BeginAnnotationHistoryActionOptions<TSnapshot> {
  id: number;
  persistAcrossUnchangedRenders?: boolean;
  commitImmediately?: boolean;
  snapshot?: TSnapshot;
}

export interface AnnotationHistoryRestoreResult<TSnapshot> {
  state: AnnotationHistoryState<TSnapshot>;
  snapshotToRestore: TSnapshot | null;
}

function appendUnique<TSnapshot>(
  stack: TSnapshot[],
  snapshots: readonly TSnapshot[],
  policy: AnnotationHistoryPolicy<TSnapshot>
): TSnapshot[] {
  let nextStack = stack;
  for (const snapshot of snapshots) {
    const cloned = policy.clone(snapshot);
    const previous = nextStack[nextStack.length - 1];
    if (previous && policy.equals(previous, cloned)) continue;
    nextStack = [...nextStack, cloned].slice(-policy.maxDepth);
  }
  return nextStack;
}

export function createAnnotationHistoryState<TSnapshot>(
  present: TSnapshot,
  policy: AnnotationHistoryPolicy<TSnapshot>
): AnnotationHistoryState<TSnapshot> {
  return {
    past: [],
    present: policy.clone(present),
    future: [],
    pendingAction: null,
  };
}

/**
 * 在一次标注动作开始前捕获旧快照。
 * 真正的入栈发生在 observeAnnotationHistoryPresent 观察到状态改变时。
 */
export function beginAnnotationHistoryAction<TSnapshot>(
  state: AnnotationHistoryState<TSnapshot>,
  label: string,
  options: BeginAnnotationHistoryActionOptions<TSnapshot>,
  policy: AnnotationHistoryPolicy<TSnapshot>
): AnnotationHistoryState<TSnapshot> {
  const current = policy.clone(options.snapshot ?? state.present);
  const pending = state.pendingAction;
  const snapshotsToFlush =
    pending && !policy.equals(pending.snapshot, current)
      ? [pending.snapshot]
      : [];
  const past = appendUnique(state.past, snapshotsToFlush, policy);

  if (options.commitImmediately) {
    return {
      past: appendUnique(past, [current], policy),
      present: current,
      future: [],
      pendingAction: null,
    };
  }

  return {
    past,
    present: current,
    future: snapshotsToFlush.length > 0 ? [] : state.future,
    pendingAction: {
      id: options.id,
      label,
      snapshot: current,
      persistAcrossUnchangedRenders:
        options.persistAcrossUnchangedRenders ?? false,
    },
  };
}

/** 将 React/原生状态容器观察到的新事实状态提交给纯历史栈。 */
export function observeAnnotationHistoryPresent<TSnapshot>(
  state: AnnotationHistoryState<TSnapshot>,
  present: TSnapshot,
  policy: AnnotationHistoryPolicy<TSnapshot>
): AnnotationHistoryState<TSnapshot> {
  const current = policy.clone(present);
  const pending = state.pendingAction;
  if (!pending) {
    return { ...state, present: current };
  }

  if (policy.equals(pending.snapshot, current)) {
    return {
      ...state,
      present: current,
      pendingAction: pending.persistAcrossUnchangedRenders ? pending : null,
    };
  }

  return {
    past: appendUnique(state.past, [pending.snapshot], policy),
    present: current,
    future: [],
    pendingAction: null,
  };
}

export function cancelAnnotationHistoryAction<TSnapshot>(
  state: AnnotationHistoryState<TSnapshot>,
  expectedActionId?: number
): AnnotationHistoryState<TSnapshot> {
  if (
    expectedActionId !== undefined &&
    state.pendingAction?.id !== expectedActionId
  ) {
    return state;
  }
  return state.pendingAction ? { ...state, pendingAction: null } : state;
}

export function clearAnnotationHistory<TSnapshot>(
  state: AnnotationHistoryState<TSnapshot>,
  present: TSnapshot,
  policy: AnnotationHistoryPolicy<TSnapshot>
): AnnotationHistoryState<TSnapshot> {
  return createAnnotationHistoryState(present, policy);
}

export function undoAnnotationHistory<TSnapshot>(
  state: AnnotationHistoryState<TSnapshot>,
  policy: AnnotationHistoryPolicy<TSnapshot>
): AnnotationHistoryRestoreResult<TSnapshot> {
  const previous = state.past[state.past.length - 1];
  if (!previous) return { state, snapshotToRestore: null };

  const restored = policy.clone(previous);
  return {
    state: {
      past: state.past.slice(0, -1),
      present: restored,
      future: appendUnique(state.future, [state.present], policy),
      pendingAction: null,
    },
    snapshotToRestore: policy.clone(restored),
  };
}

export function redoAnnotationHistory<TSnapshot>(
  state: AnnotationHistoryState<TSnapshot>,
  policy: AnnotationHistoryPolicy<TSnapshot>
): AnnotationHistoryRestoreResult<TSnapshot> {
  const next = state.future[state.future.length - 1];
  if (!next) return { state, snapshotToRestore: null };

  const restored = policy.clone(next);
  return {
    state: {
      past: appendUnique(state.past, [state.present], policy),
      present: restored,
      future: state.future.slice(0, -1),
      pendingAction: null,
    },
    snapshotToRestore: policy.clone(restored),
  };
}
