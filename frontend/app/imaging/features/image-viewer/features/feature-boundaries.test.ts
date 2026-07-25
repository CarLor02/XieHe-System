import fs from 'node:fs';
import path from 'node:path';

import { expect, it } from '@jest/globals';

const FEATURES_ROOT = path.resolve(__dirname);
const SOURCE_FILE_PATTERN = /\.(?:ts|tsx)$/;

function collectSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    if (!SOURCE_FILE_PATTERN.test(entry.name)) return [];
    return [entryPath];
  });
}

function findForbiddenImports(
  featureName: 'keypoints' | 'measurements',
  forbiddenFeatureNames: string[]
): string[] {
  const featureRoot = path.join(FEATURES_ROOT, featureName);
  return collectSourceFiles(featureRoot).flatMap(filePath => {
    const source = fs.readFileSync(filePath, 'utf8');
    return forbiddenFeatureNames
      .filter(forbiddenName => source.includes(`/features/${forbiddenName}`))
      .map(
        forbiddenName =>
          `${path.relative(FEATURES_ROOT, filePath)} -> ${forbiddenName}`
      );
  });
}

it('keeps keypoints independent from measurements and their synchronization layer', () => {
  expect(
    findForbiddenImports('keypoints', [
      'measurements',
      'measurement-keypoint-sync',
    ])
  ).toEqual([]);
});

it('keeps measurements independent from keypoints and their synchronization layer', () => {
  expect(
    findForbiddenImports('measurements', [
      'keypoints',
      'measurement-keypoint-sync',
    ])
  ).toEqual([]);
});
