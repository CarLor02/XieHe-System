import { describe, expect, it, vi } from 'vitest';

import { runBatchExport } from './run-batch-export';

describe('runBatchExport', () => {
  it('builds annotation-point artifacts without a browser implementation', async () => {
    const encodeText = vi.fn(({ content }: { content: string }) => content);
    const downloadOriginal = vi.fn();
    const progress = vi.fn();

    const files = await runBatchExport({
      images: [
        {
          id: 7,
          original_filename: 'study.png',
          description: '正位X光片',
          annotation: null,
        },
      ],
      exportContent: 'annotation-points',
      ports: {
        downloadOriginal,
        renderImage: vi.fn(),
        convertToPng: vi.fn(),
        encodeJson: value => JSON.stringify(value),
        encodeText,
      },
      onProgress: progress,
    });

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('study.csv');
    expect(downloadOriginal).not.toHaveBeenCalled();
    expect(encodeText).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenCalledWith(85);
  });
});
