import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const PACKAGE_NAMES = [
  'xiehe-access-core',
  'xiehe-auth-core',
  'xiehe-dashboard-core',
  'xiehe-patient-core',
  'xiehe-upload-core',
];
const FORBIDDEN_IMPORTS = [
  /^react(?:\/|-|$)/,
  /^react-native(?:\/|-|$)/,
  /^next(?:\/|-|$)/,
  /^expo(?:\/|-|$)/,
  /^@\//,
];
const FORBIDDEN_GLOBALS = [
  /\bwindow\s*\./,
  /\bdocument\s*\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];
const MODULE_SPECIFIER = /\b(?:from|import)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return extname(entry.name) === '.ts' && !path.endsWith('.test.ts')
      ? [path]
      : [];
  });
}

const violations = PACKAGE_NAMES.flatMap(packageName => {
  const sourceRoot = join('packages', packageName, 'src');
  return collectSourceFiles(sourceRoot).flatMap(path => {
    const source = readFileSync(path, 'utf8');
    const imports = Array.from(
      source.matchAll(MODULE_SPECIFIER),
      match => match[1]
    )
      .filter(specifier =>
        FORBIDDEN_IMPORTS.some(pattern => pattern.test(specifier))
      )
      .map(specifier => `${relative('.', path)} imports ${specifier}`);
    const globals = FORBIDDEN_GLOBALS.filter(pattern =>
      pattern.test(source)
    ).map(pattern => `${relative('.', path)} matches ${pattern.source}`);
    return [...imports, ...globals];
  });
});

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Shared business packages keep platform-independent boundaries.');
}
