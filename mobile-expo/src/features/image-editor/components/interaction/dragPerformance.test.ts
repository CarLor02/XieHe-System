import { expect, it } from 'vitest';
import {
  DragPerformanceMonitor,
  emptyTimings,
  recordTiming,
  summarizeTimings,
} from './dragPerformance';

it('keeps bounded timing histograms and distinguishes frame cadence from calculation time', () => {
  let samples = emptyTimings();
  for (let i = 0; i < 10000; i++)
    samples = recordTiming(samples, i % 10 ? 16.6 : 33.3);
  expect(samples.buckets).toHaveLength(121);
  expect(summarizeTimings(samples)).toEqual({
    count: 10000,
    mean: expect.closeTo(18.27, 5),
    p95: 34,
    max: 33.3,
  });
  expect(recordTiming(samples, NaN)).toBe(samples);
  expect(summarizeTimings(recordTiming(emptyTimings(), 300)).p95).toBe(120);
});

it('records only enabled gestures, ignores stale work, and publishes only on completion', () => {
  let now = 0;
  const monitor = new DragPerformanceMonitor(() => now);
  monitor.begin(1);
  monitor.finish(1, emptyTimings(), false);
  expect(monitor.getState().last).toBeNull();
  monitor.setEnabled(true);
  monitor.begin(2);
  monitor.calculation(1, 1000);
  monitor.calculation(2, 2);
  monitor.committed();
  now = 20;
  monitor.committed();
  expect(monitor.getState().last).toBeNull();
  now = 50;
  monitor.finish(2, recordTiming(emptyTimings(), 16.7), true);
  expect(monitor.getState().last).toMatchObject({
    durationMs: 50,
    cancelled: true,
    ui: { count: 1, mean: 16.7 },
    calculation: { count: 1, mean: 2 },
    commit: { count: 1, mean: 20 },
  });
  const last = monitor.getState().last;
  monitor.begin(3);
  monitor.setEnabled(false);
  monitor.finish(3, emptyTimings(), false);
  expect(monitor.getState().last).toBe(last);
});
