import { readFileSync } from 'fs';
import { join } from 'path';
import { expect, it } from '@jest/globals';

it('does not render the deprecated data export navigation entry', () => {
  const source = readFileSync(join(process.cwd(), 'components/Sidebar.tsx'), 'utf8');

  expect(source).toContain("name: '影像中心'");
  expect(source).not.toContain("name: '数据导出'");
  expect(source).not.toContain("href: '/data-export'");
});
