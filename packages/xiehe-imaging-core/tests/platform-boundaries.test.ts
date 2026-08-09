import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = join(PACKAGE_ROOT, 'src');
const FORBIDDEN_PATTERNS = [
  "from 'react'",
  'from "react"',
  "from 'react-native'",
  'from "react-native"',
  "from 'next",
  'from "next',
  'window.',
  'document.',
  'localStorage',
  'sessionStorage',
];

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return extname(entry.name) === '.ts' ? [path] : [];
  });
}

describe('imaging core platform boundary', () => {
  it('does not import platform runtimes or browser storage', () => {
    const violations = collectTypeScriptFiles(SOURCE_ROOT).flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return FORBIDDEN_PATTERNS.filter(pattern => source.includes(pattern)).map(
        pattern => `${path.slice(PACKAGE_ROOT.length + 1)} contains ${pattern}`
      );
    });

    expect(violations).toEqual([]);
  });
});
