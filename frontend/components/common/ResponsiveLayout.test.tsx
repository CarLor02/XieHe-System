import { readFileSync } from 'fs';
import { join } from 'path';
import { expect, it } from '@jest/globals';

it('uses static Tailwind classes for responsive grid columns and gaps', () => {
  const source = readFileSync(
    join(process.cwd(), 'components/common/ResponsiveLayout.tsx'),
    'utf8'
  );

  expect(source).not.toContain('grid-cols-${');
  expect(source).not.toContain('gap-${gap}');
});
