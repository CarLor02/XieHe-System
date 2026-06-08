import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useMemo, useState } from 'react';
import { expect, it } from '@jest/globals';

import { useAnnotationHistory } from '@/app/imaging/features/image-viewer/application/hooks/useAnnotationHistory';

interface TestSnapshot {
  count: number;
}

type HistoryValue = ReturnType<typeof useAnnotationHistory<TestSnapshot>> & {
  count: number;
  setCount: (count: number) => void;
  rerenderWithoutSnapshotChange: () => void;
};

function HistoryHarness({
  onValue,
}: {
  onValue: (value: HistoryValue) => void;
}) {
  const [count, setCount] = useState(0);
  const [, setRenderTick] = useState(0);
  const snapshot = useMemo(() => ({ count }), [count]);
  const history = useAnnotationHistory<TestSnapshot>({
    snapshot,
    restoreSnapshot: restored => setCount(restored.count),
    maxDepth: 2,
  });

  useEffect(() => {
    onValue({
      ...history,
      count,
      setCount,
      rerenderWithoutSnapshotChange: () =>
        setRenderTick(previous => previous + 1),
    });
  }, [count, history, onValue]);

  return null;
}

it('records the previous annotation snapshot after a changed action and restores it on undo', async () => {
  let latest: HistoryValue | null = null;

  render(
    <HistoryHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.beginHistoryAction('change-count');
    latest!.setCount(1);
  });

  await waitFor(() => {
    expect(latest!.count).toBe(1);
    expect(latest!.canUndo).toBe(true);
  });

  act(() => {
    latest!.undo();
  });

  await waitFor(() => {
    expect(latest!.count).toBe(0);
    expect(latest!.canUndo).toBe(false);
  });
});

it('does not record a history entry when the annotation snapshot is unchanged', async () => {
  let latest: HistoryValue | null = null;

  render(
    <HistoryHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.beginHistoryAction('no-change');
    latest!.setCount(0);
  });

  await waitFor(() => {
    expect(latest!.count).toBe(0);
  });
  expect(latest!.canUndo).toBe(false);
});

it('does not let an unchanged sync action record a later untracked snapshot change', async () => {
  let latest: HistoryValue | null = null;

  render(
    <HistoryHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.beginHistoryAction('no-change');
  });

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  act(() => {
    latest!.setCount(1);
  });

  await waitFor(() => {
    expect(latest!.count).toBe(1);
  });
  expect(latest!.canUndo).toBe(false);
});

it('keeps persistent actions across unchanged renders until the snapshot changes', async () => {
  let latest: HistoryValue | null = null;

  render(
    <HistoryHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.beginHistoryAction('async-change', {
      persistAcrossUnchangedRenders: true,
    });
    latest!.rerenderWithoutSnapshotChange();
  });

  await waitFor(() => {
    expect(latest!.count).toBe(0);
  });

  act(() => {
    latest!.setCount(1);
  });

  await waitFor(() => {
    expect(latest!.count).toBe(1);
    expect(latest!.canUndo).toBe(true);
  });
});

it('records immediate destructive actions before a following undo can use older history', async () => {
  let latest: HistoryValue | null = null;

  render(
    <HistoryHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.beginHistoryAction('first-change');
    latest!.setCount(1);
  });

  await waitFor(() => {
    expect(latest!.count).toBe(1);
    expect(latest!.canUndo).toBe(true);
  });

  act(() => {
    latest!.beginHistoryAction('clear-all', {
      commitImmediately: true,
      snapshot: { count: latest!.count },
    });
    latest!.setCount(0);
    latest!.undo();
  });

  await waitFor(() => {
    expect(latest!.count).toBe(1);
  });
});

it('keeps only the configured number of undo snapshots', async () => {
  let latest: HistoryValue | null = null;

  render(
    <HistoryHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  for (const nextCount of [1, 2, 3]) {
    act(() => {
      latest!.beginHistoryAction(`count-${nextCount}`);
      latest!.setCount(nextCount);
    });

    await waitFor(() => {
      expect(latest!.count).toBe(nextCount);
    });
  }

  act(() => {
    latest!.undo();
  });
  await waitFor(() => {
    expect(latest!.count).toBe(2);
  });

  act(() => {
    latest!.undo();
  });
  await waitFor(() => {
    expect(latest!.count).toBe(1);
  });

  expect(latest!.canUndo).toBe(false);
});
