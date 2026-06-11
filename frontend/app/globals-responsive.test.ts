import { readFileSync } from 'fs';
import { join } from 'path';

it('does not globally force a desktop minimum page width', () => {
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

  expect(css).not.toMatch(/body\s*\{[^}]*min-width\s*:\s*1280px/i);
  expect(css).not.toMatch(/html\s*\{[^}]*overflow-x\s*:\s*auto/i);
});
