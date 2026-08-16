import { describe, expect, it, vi } from 'vitest';

import { runWithConcurrency } from './concurrency';
import { runMultipartUpload } from './multipart-upload';

describe('runWithConcurrency', () => {
  it('does not exceed the configured concurrency', async () => {
    let active = 0;
    let peak = 0;

    await runWithConcurrency([1, 2, 3, 4], 2, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
    });

    expect(peak).toBe(2);
  });
});

describe('runMultipartUpload', () => {
  it('aggregates monotonic byte progress and returns etags by part number', async () => {
    const progress: number[] = [];

    const completed = await runMultipartUpload({
      parts: [
        { partNumber: 3, size: 2 },
        { partNumber: 1, size: 4 },
        { partNumber: 2, size: 4 },
      ],
      totalBytes: 10,
      concurrency: 3,
      onProgress: snapshot => progress.push(snapshot.loadedBytes),
      uploadPart: async (part, context) => {
        if (part.partNumber === 1) context.onProgress(4);
        if (part.partNumber === 2) {
          context.onProgress(2);
          context.onProgress(1);
        }
        if (part.partNumber === 3) context.onProgress(2);
        return `etag-${part.partNumber}`;
      },
    });

    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(10);
    expect(
      progress.every(
        (value, index) => index === 0 || value >= progress[index - 1]
      )
    ).toBe(true);
    expect(completed).toEqual([
      { partNumber: 1, etag: 'etag-1' },
      { partNumber: 2, etag: 'etag-2' },
      { partNumber: 3, etag: 'etag-3' },
    ]);
  });

  it('limits concurrent part uploads', async () => {
    let active = 0;
    let peak = 0;

    await runMultipartUpload({
      parts: [1, 2, 3, 4].map(partNumber => ({ partNumber, size: 1 })),
      totalBytes: 4,
      concurrency: 2,
      uploadPart: async part => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        return `etag-${part.partNumber}`;
      },
    });

    expect(peak).toBe(2);
  });

  it('aborts sibling uploads and does not start remaining parts after a failure', async () => {
    const started: number[] = [];
    const observedAbort = vi.fn();

    await expect(
      runMultipartUpload({
        parts: [1, 2, 3].map(partNumber => ({ partNumber, size: 1 })),
        totalBytes: 3,
        concurrency: 2,
        uploadPart: async (part, context) => {
          started.push(part.partNumber);
          if (part.partNumber === 1) {
            await Promise.resolve();
            throw new Error('part failed');
          }
          await new Promise<void>((_resolve, reject) => {
            context.signal.addEventListener(
              'abort',
              () => {
                observedAbort();
                reject(new Error('aborted'));
              },
              { once: true }
            );
          });
          return `etag-${part.partNumber}`;
        },
      })
    ).rejects.toThrow('part failed');

    expect(started).toEqual([1, 2]);
    expect(observedAbort).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate part numbers', async () => {
    await expect(
      runMultipartUpload({
        parts: [
          { partNumber: 1, size: 1 },
          { partNumber: 1, size: 1 },
        ],
        totalBytes: 2,
        concurrency: 2,
        uploadPart: vi.fn(async () => 'etag'),
      })
    ).rejects.toThrow('part numbers must be unique');
  });
});
