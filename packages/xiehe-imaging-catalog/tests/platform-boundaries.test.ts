import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = join(PACKAGE_ROOT, 'src');
const FORBIDDEN_IMPORTS = [
  /^react(?:\/|-|$)/,
  /^react-native(?:\/|-|$)/,
  /^next(?:\/|-|$)/,
  /^expo(?:\/|-|$)/,
  /^@\//,
];
const BROWSER_GLOBALS = [
  /\bwindow\s*\./,
  /\bdocument\s*\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];
const MODULE_SPECIFIER = /\b(?:from|import)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return extname(entry.name) === '.ts' && !path.endsWith('.test.ts')
      ? [path]
      : [];
  });
}

describe('imaging catalog platform boundary', () => {
  const files = collectTypeScriptFiles(SOURCE_ROOT);

  it('does not import UI runtimes or Web aliases', () => {
    const violations = files.flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return Array.from(source.matchAll(MODULE_SPECIFIER), match => match[1])
        .filter(specifier =>
          FORBIDDEN_IMPORTS.some(pattern => pattern.test(specifier))
        )
        .map(specifier => `${path} imports ${specifier}`);
    });
    expect(violations).toEqual([]);
  });

  it('does not access browser-only globals', () => {
    const violations = files.flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return BROWSER_GLOBALS.filter(pattern => pattern.test(source)).map(
        pattern => `${path} matches ${pattern.source}`
      );
    });
    expect(violations).toEqual([]);
  });
});
