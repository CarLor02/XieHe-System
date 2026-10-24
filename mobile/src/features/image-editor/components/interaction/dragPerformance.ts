export type TimingSamples = {
  count: number;
  total: number;
  max: number;
  buckets: number[];
};
export type TimingSummary = {
  count: number;
  mean: number;
  p95: number;
  max: number;
};

export function emptyTimings(): TimingSamples {
  'worklet';
  return { count: 0, total: 0, max: 0, buckets: Array(121).fill(0) };
}
/** 固定大小直方图，不保留触点、图像 ID 或随拖动时长增长的事件列表。 */
export function recordTiming(
  samples: TimingSamples,
  milliseconds: number
): TimingSamples {
  'worklet';
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return samples;
  const buckets = samples.buckets.slice();
  buckets[Math.min(120, Math.ceil(milliseconds))] += 1;
  return {
    count: samples.count + 1,
    total: samples.total + milliseconds,
    max: Math.max(samples.max, milliseconds),
    buckets,
  };
}
export function summarizeTimings(samples: TimingSamples): TimingSummary {
  let count = 0,
    p95 = 0;
  for (let i = 0; i < samples.buckets.length; i++) {
    count += samples.buckets[i];
    if (count >= Math.ceil(samples.count * 0.95)) {
      p95 = i;
      break;
    }
  }
  return {
    count: samples.count,
    mean: samples.count ? samples.total / samples.count : 0,
    p95,
    max: samples.max,
  };
}
export interface DragPerformanceReport {
  durationMs: number;
  cancelled: boolean;
  ui: TimingSummary;
  calculation: TimingSummary;
  commit: TimingSummary;
}
type State = { enabled: boolean; last: DragPerformanceReport | null };

export class DragPerformanceMonitor {
  private state: State = { enabled: false, last: null };
  private listeners = new Set<() => void>();
  private active: {
    id: number;
    start: number;
    lastCommit: number | null;
    calculation: TimingSamples;
    commit: TimingSamples;
  } | null = null;
  constructor(private now: () => number = () => performance.now()) {}
  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  setEnabled(enabled: boolean) {
    this.state = { ...this.state, enabled };
    this.active = null;
    this.listeners.forEach(listener => listener());
  }
  begin(id: number) {
    if (this.state.enabled)
      this.active = {
        id,
        start: this.now(),
        lastCommit: null,
        calculation: emptyTimings(),
        commit: emptyTimings(),
      };
  }
  calculation(id: number, milliseconds: number) {
    if (this.active?.id === id)
      this.active.calculation = recordTiming(
        this.active.calculation,
        milliseconds
      );
  }
  committed() {
    if (!this.active) return;
    const now = this.now();
    if (this.active.lastCommit !== null)
      this.active.commit = recordTiming(
        this.active.commit,
        now - this.active.lastCommit
      );
    this.active.lastCommit = now;
  }
  finish(id: number, frames: TimingSamples, cancelled: boolean) {
    if (this.active?.id !== id) return;
    const active = this.active;
    this.active = null;
    this.state = {
      ...this.state,
      last: {
        durationMs: this.now() - active.start,
        cancelled,
        ui: summarizeTimings(frames),
        calculation: summarizeTimings(active.calculation),
        commit: summarizeTimings(active.commit),
      },
    };
    this.listeners.forEach(listener => listener());
  }
}
