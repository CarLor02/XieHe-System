import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = join(PACKAGE_ROOT, 'src');
const BROWSER_GLOBAL_PATTERNS = [
  /\bwindow\s*\./,
  /\bdocument\s*\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];
const FORBIDDEN_MODULE_PATTERNS = [
  /^react(?:\/|-|$)/,
  /^react-native(?:\/|-|$)/,
  /^next(?:\/|-|$)/,
  /^expo(?:\/|-|$)/,
  /^@\//,
  /^@xiehe\/imaging-core(?:\/|$)/,
];
const MODULE_SPECIFIER_PATTERN =
  /\b(?:from|import)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return extname(entry.name) === '.ts' ? [path] : [];
  });
}

function toPackagePath(path: string): string {
  return relative(PACKAGE_ROOT, path).split(sep).join('/');
}

function toSourcePath(path: string): string {
  return relative(SOURCE_ROOT, path).split(sep).join('/');
}

function hasLayerSegment(
  path: string,
  layer: 'domain' | 'application'
): boolean {
  return path.split('/').includes(layer);
}

function getModuleSpecifiers(source: string): string[] {
  return Array.from(
    source.matchAll(MODULE_SPECIFIER_PATTERN),
    match => match[1]
  );
}

function isForbiddenModule(specifier: string): boolean {
  return FORBIDDEN_MODULE_PATTERNS.some(pattern => pattern.test(specifier));
}

const sourceFiles = collectTypeScriptFiles(SOURCE_ROOT).filter(
  path => !path.endsWith('.test.ts')
);

describe('imaging core platform boundary', () => {
  it('does not import platform runtimes, Web aliases, or the package facade', () => {
    const violations = sourceFiles.flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return getModuleSpecifiers(source)
        .filter(isForbiddenModule)
        .map(specifier => `${toPackagePath(path)} imports ${specifier}`);
    });

    expect(violations).toEqual([]);
  });

  it('does not access browser-only globals', () => {
    const violations = sourceFiles.flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return BROWSER_GLOBAL_PATTERNS.filter(pattern =>
        pattern.test(source)
      ).map(pattern => `${toPackagePath(path)} matches ${pattern.source}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps domain code independent from facades and application layers', () => {
    const domainFiles = sourceFiles.filter(path =>
      toSourcePath(path).includes('/domain/')
    );
    const violations = domainFiles.flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return getModuleSpecifiers(source)
        .filter(specifier => specifier.startsWith('.'))
        .map(specifier => ({
          specifier,
          target: toSourcePath(resolve(dirname(path), specifier)),
        }))
        .filter(({ target }) => !hasLayerSegment(target, 'domain'))
        .map(
          ({ specifier }) =>
            `${toPackagePath(path)} imports non-domain module ${specifier}`
        );
    });

    expect(violations).toEqual([]);
  });

  it('keeps application code on domain and application dependencies', () => {
    const applicationFiles = sourceFiles.filter(path =>
      toSourcePath(path).includes('/application/')
    );
    const violations = applicationFiles.flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return getModuleSpecifiers(source)
        .filter(specifier => specifier.startsWith('.'))
        .map(specifier => ({
          specifier,
          target: toSourcePath(resolve(dirname(path), specifier)),
        }))
        .filter(
          ({ target }) =>
            !hasLayerSegment(target, 'domain') &&
            !hasLayerSegment(target, 'application')
        )
        .map(
          ({ specifier }) =>
            `${toPackagePath(path)} imports layer facade ${specifier}`
        );
    });

    expect(violations).toEqual([]);
  });
});
