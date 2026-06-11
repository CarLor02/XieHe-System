import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const root = process.cwd();

describe('upload patient selection integration', () => {
  it('does not eagerly load a large patient list in the upload page', () => {
    const source = readFileSync(path.join(root, 'app/upload/page.tsx'), 'utf8');

    expect(source).not.toContain('page_size: 100');
    expect(source).toContain('<PatientSearchSelect');
  });
});
