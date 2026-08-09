import { expect, it } from 'vitest';
import { resolveAvtDefinition } from './measurement-geometry';

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
