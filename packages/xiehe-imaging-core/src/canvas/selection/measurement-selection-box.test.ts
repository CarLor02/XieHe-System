import { expect, it } from 'vitest';

import { getMeasurementSelectionBoxInScreen } from './measurement-selection-box';

it('limits a manual TTS selection box to its trunk line', () => {
  expect(
    getMeasurementSelectionBoxInScreen(
      {
        id: 'manual-tts',
        type: 'tts',
        value: '-9.00mm',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 40, y: 100 },
          { x: 60, y: 100 },
        ],
      },
      point => point
    )
  ).toEqual({
    minX: -5,
    maxX: 45,
    minY: 5,
    maxY: 35,
  });
});
