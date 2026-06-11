import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const root = process.cwd();

function readFrontendFile(relativePath: string) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('responsive overlay layouts', () => {
  it('stacks the user settings navigation on small screens', () => {
    const source = readFrontendFile('components/UserSettings.tsx');

    expect(source).toContain('flex h-full min-h-0 flex-col md:flex-row');
    expect(source).toMatch(
      /flex w-full flex-shrink-0 flex-col bg-gray-50[^"]*md:w-64/
    );
    expect(source).not.toContain('flex h-full w-64 flex-shrink-0');
  });

  it('uses a single-column upload options overlay before desktop width', () => {
    const source = readFrontendFile(
      'app/upload/_components/overlay/upload-options-overlay.tsx'
    );

    expect(source).toContain('grid grid-cols-1 gap-6');
    expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_350px]');
    expect(source).not.toContain('grid grid-cols-[minmax(0,1fr)_350px]');
  });
});
