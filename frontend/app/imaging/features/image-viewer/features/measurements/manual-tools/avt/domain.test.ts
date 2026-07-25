import { expect, it } from '@jest/globals';
import {
  AVT_DISC_TARGETS,
  AVT_VERTEBRA_TARGETS,
  buildAvtPoints,
  calculateAvtValue,
  createAvtMetadata,
  createHorizontalDiscAnchors,
  getAvtGeometry,
  getAvtPointLayout,
  getAvtReferenceLine,
  resolveAvtDefinition,
  updateHorizontalDiscAnchors,
} from './domain';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

const calculationContext = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
  imageNaturalSize: { width: 1000, height: 2000 },
};

function pointMap(entries: Array<[string, Point]>): Map<string, Point> {
  return new Map(entries);
}

it('defines AVT vertebra and adjacent disc targets from T2 through L4', () => {
  expect(AVT_VERTEBRA_TARGETS[0]).toBe('T2');
  expect(AVT_VERTEBRA_TARGETS.at(-1)).toBe('L4');
  expect(AVT_DISC_TARGETS[0]).toEqual({
    type: 'disc',
    upperVertebra: 'T2',
    lowerVertebra: 'T3',
  });
  expect(AVT_DISC_TARGETS.at(-1)).toEqual({
    type: 'disc',
    upperVertebra: 'L3',
    lowerVertebra: 'L4',
  });
});

it('uses C7PL through T11 and for the T11-T12 disc boundary', () => {
  expect(getAvtReferenceLine({ type: 'vertebra', vertebra: 'T11' })).toBe(
    'c7pl'
  );
  expect(getAvtReferenceLine({ type: 'vertebra', vertebra: 'T12' })).toBe(
    'csvl'
  );
  expect(
    getAvtReferenceLine({
      type: 'disc',
      upperVertebra: 'T11',
      lowerVertebra: 'T12',
    })
  ).toBe('c7pl');
  expect(
    getAvtReferenceLine({
      type: 'disc',
      upperVertebra: 'T12',
      lowerVertebra: 'L1',
    })
  ).toBe('csvl');
});

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

it('keeps manually placed disc anchors horizontal, sorted and vertically movable', () => {
  expect(
    createHorizontalDiscAnchors({ x: 40, y: 20 }, { x: 10, y: 80 })
  ).toEqual([
    { x: 10, y: 20 },
    { x: 40, y: 20 },
  ]);

  expect(
    updateHorizontalDiscAnchors(
      [
        { x: 10, y: 20 },
        { x: 40, y: 20 },
      ],
      0,
      { x: 50, y: 60 }
    )
  ).toEqual([
    { x: 40, y: 60 },
    { x: 50, y: 60 },
  ]);
});

it('calculates disc AVT from the manual line midpoint to the selected reference', () => {
  const measurement = {
    points: [
      { x: 80, y: 100 },
      { x: 120, y: 100 },
      { x: 180, y: 300 },
      { x: 220, y: 300 },
    ],
    apexVertebra: null,
    avtMetadata: createAvtMetadata({
      type: 'disc',
      upperVertebra: 'T12',
      lowerVertebra: 'L1',
    }),
  };

  expect(getAvtGeometry(measurement)?.targetCenter).toEqual({
    x: 100,
    y: 100,
  });
  expect(calculateAvtValue(measurement, calculationContext)).toBe('-100.00mm');
});

it('keeps historical two-point and six-point AVT layouts explicit', () => {
  expect(
    resolveAvtDefinition({
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      apexVertebra: 'T8',
    })?.layout
  ).toBe('legacy-two-point');
  expect(
    resolveAvtDefinition({
      points: Array.from({ length: 6 }, (_, index) => ({
        x: index,
        y: index,
      })),
      apexVertebra: 'T12',
    })?.layout
  ).toBe('legacy-six-point');
});
