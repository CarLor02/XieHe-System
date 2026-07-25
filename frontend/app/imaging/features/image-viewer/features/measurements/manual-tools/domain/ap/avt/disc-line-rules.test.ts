import { expect, it } from '@jest/globals';
import {
  createHorizontalDiscAnchors,
  updateHorizontalDiscAnchors,
} from './disc-line-rules';

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
