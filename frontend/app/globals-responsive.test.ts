import { readFileSync } from 'fs';
import { join } from 'path';
import { expect, it } from '@jest/globals';

it('does not globally force a desktop minimum page width', () => {
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

  expect(css).not.toMatch(/body\s*\{[^}]*min-width\s*:\s*1280px/i);
  expect(css).not.toMatch(/html\s*\{[^}]*overflow-x\s*:\s*auto/i);
  expect(css).not.toContain("../styles/responsive.css");
});
