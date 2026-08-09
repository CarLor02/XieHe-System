import { expect, it } from 'vitest';
import {
  AVT_DISC_TARGETS,
  AVT_VERTEBRA_TARGETS,
  getAvtReferenceLine,
} from './target-rules';

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
