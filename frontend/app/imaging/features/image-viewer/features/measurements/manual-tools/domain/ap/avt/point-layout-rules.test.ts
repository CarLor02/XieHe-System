import { expect, it } from '@jest/globals';
import type { Point } from '@xiehe/imaging-core/contracts';
import { createAvtMetadata } from './target-rules';
import { buildAvtPoints, getAvtPointLayout } from './point-layout-rules';

function pointMap(entries: Array<[string, Point]>): Map<string, Point> {
  return new Map(entries);
}

it('builds each metadata point layout without mixing target and reference points', () => {
  const c7Points: Array<[string, Point]> = [1, 2, 3, 4].map(index => [
    `C7-${index}`,
    { x: 200 + index, y: 20 + index },
  ]);
  const t2Points: Array<[string, Point]> = [1, 2, 3, 4].map(index => [
    `T2-${index}`,
    { x: 100 + index, y: 100 + index },
  ]);
  const references = pointMap([
    ...c7Points,
    ...t2Points,
    ['SR', { x: 300, y: 400 }],
    ['SL', { x: 200, y: 400 }],
  ]);
  const discAnchors: [Point, Point] = [
    { x: 90, y: 150 },
    { x: 130, y: 150 },
  ];

  const vertebraC7pl = createAvtMetadata({
    type: 'vertebra',
    vertebra: 'T2',
  });
  const vertebraCsvl = createAvtMetadata({
    type: 'vertebra',
    vertebra: 'T12',
  });
  const discC7pl = createAvtMetadata({
    type: 'disc',
    upperVertebra: 'T2',
    lowerVertebra: 'T3',
  });
  const discCsvl = createAvtMetadata({
    type: 'disc',
    upperVertebra: 'T12',
    lowerVertebra: 'L1',
  });

  expect(getAvtPointLayout(vertebraC7pl)).toBe('vertebra-c7pl');
  expect(buildAvtPoints(vertebraC7pl, references)).toHaveLength(8);
  expect(getAvtPointLayout(vertebraCsvl)).toBe('vertebra-csvl');
  expect(buildAvtPoints(vertebraCsvl, references)).toBeNull();
  expect(getAvtPointLayout(discC7pl)).toBe('disc-c7pl');
  expect(buildAvtPoints(discC7pl, references, discAnchors)).toHaveLength(6);
  expect(getAvtPointLayout(discCsvl)).toBe('disc-csvl');
  expect(buildAvtPoints(discCsvl, references, discAnchors)).toHaveLength(4);
});
