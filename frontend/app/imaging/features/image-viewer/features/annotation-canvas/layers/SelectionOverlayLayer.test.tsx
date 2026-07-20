import { render } from '@testing-library/react';
import { expect, it } from '@jest/globals';

import SelectionOverlayLayer from './SelectionOverlayLayer';

it('draws a manual TTS whole-selection box around only the trunk line', () => {
  const { container } = render(
    <svg>
      <SelectionOverlayLayer
        selectionState={{
          measurementId: 'manual-tts',
          pointIndex: null,
          type: 'whole',
          isDragging: false,
          dragOffset: { x: 0, y: 0 },
        }}
        measurements={[
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
        ]}
        clickedPoints={[]}
        imageToScreen={point => point}
      />
    </svg>
  );

  const selectionRect = container.querySelector('rect');
  expect(selectionRect?.getAttribute('x')).toBe('-5');
  expect(selectionRect?.getAttribute('y')).toBe('5');
  expect(selectionRect?.getAttribute('width')).toBe('50');
  expect(selectionRect?.getAttribute('height')).toBe('30');
});
