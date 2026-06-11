import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const root = process.cwd();

describe('data export responsive layout', () => {
  it('keeps the image table horizontally scrollable on narrow viewports', () => {
    const source = readFileSync(
      path.join(root, 'app/data-export/page.tsx'),
      'utf8'
    );

    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('min-w-[760px] w-full');
  });
});
