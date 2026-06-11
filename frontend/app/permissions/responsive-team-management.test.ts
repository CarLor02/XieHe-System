import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const root = process.cwd();

describe('team management responsive layout', () => {
  it('stacks the team list and details on narrow viewports', () => {
    const source = readFileSync(
      path.join(root, 'app/permissions/TeamManagement.tsx'),
      'utf8'
    );

    expect(source).toContain(
      'flex min-w-0 flex-col gap-4 lg:h-[calc(100vh-280px)] lg:flex-row lg:gap-6'
    );
    expect(source).toContain('max-h-96 w-full flex-shrink-0');
    expect(source).toContain('lg:w-64');
    expect(source).toContain('xl:w-80');
    expect(source).toContain('overflow-visible lg:overflow-hidden');
  });
});
