import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const root = process.cwd();

describe('team management responsive layout', () => {
  it('shrinks the team list before desktop width so details keep space', () => {
    const source = readFileSync(
      path.join(root, 'app/permissions/TeamManagement.tsx'),
      'utf8'
    );

    expect(source).toContain('flex h-[calc(100vh-280px)] min-w-0 gap-4 lg:gap-6');
    expect(source).toContain('w-40 flex-shrink-0');
    expect(source).toContain('sm:w-56');
    expect(source).toContain('lg:w-80');
    expect(source).not.toContain('flex w-80 flex-col');
  });
});
