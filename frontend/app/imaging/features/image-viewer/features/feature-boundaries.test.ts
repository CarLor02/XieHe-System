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
  featureName: string,
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

function findForbiddenSourcePatterns(
  directory: string,
  patterns: string[]
): string[] {
  return collectSourceFiles(path.join(FEATURES_ROOT, directory)).flatMap(
    filePath => {
      const source = fs.readFileSync(filePath, 'utf8');
      return patterns
        .filter(pattern => source.includes(pattern))
        .map(
          pattern =>
            `${path.relative(FEATURES_ROOT, filePath)} contains ${pattern}`
        );
    }
  );
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

it('keeps measurements independent from annotation canvas presentation', () => {
  expect(findForbiddenImports('measurements', ['annotation-canvas'])).toEqual(
    []
  );
});

it('keeps annotation canvas domain pure and independent from outer layers', () => {
  expect(
    findForbiddenSourcePatterns('annotation-canvas/domain', [
      "from 'react'",
      'from "react"',
      'document.',
      'window.',
      '/annotation-canvas/application/',
      '/annotation-canvas/presentation/',
    ])
  ).toEqual([]);
});

it('prevents annotation canvas application from importing presentation', () => {
  expect(
    findForbiddenSourcePatterns('annotation-canvas/application', [
      '/annotation-canvas/presentation/',
    ])
  ).toEqual([]);
});

it('keeps variable measurement layout parsing out of canvas domain and application', () => {
  const forbiddenParsers = [
    'extractBilateralPelvicPoints',
    'getPelvicMeasurementGeometry',
    'getTpaGeometry',
    'isPelvicMeasurementMetadata',
  ];
  expect(
    findForbiddenSourcePatterns('annotation-canvas/domain', forbiddenParsers)
  ).toEqual([]);
  expect(
    findForbiddenSourcePatterns(
      'annotation-canvas/application',
      forbiddenParsers
    )
  ).toEqual([]);
});
