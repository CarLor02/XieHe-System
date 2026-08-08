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

it('draws the bilateral TPA effective CFH selection box at the FH midpoint', () => {
  const { container } = render(
    <svg>
      <SelectionOverlayLayer
        selectionState={{
          measurementId: 'tpa-bilateral',
          pointIndex: null,
          type: 'effective-cfh',
          isDragging: false,
          dragOffset: { x: 0, y: 0 },
        }}
        measurements={[
          {
            id: 'tpa-bilateral',
            type: 'TPA',
            value: '20.00°',
            points: [
              { x: 10, y: 10 },
              { x: 20, y: 10 },
              { x: 10, y: 20 },
              { x: 20, y: 20 },
              { x: 100, y: 200 },
              { x: 120, y: 200 },
              { x: 200, y: 240 },
              { x: 220, y: 240 },
              { x: 120, y: 400 },
              { x: 240, y: 400 },
            ],
            pelvicMetadata: {
              schemaVersion: 2,
              femoralHeadMode: 'bilateral',
            },
          },
        ]}
        clickedPoints={[]}
        imageToScreen={point => point}
      />
    </svg>
  );

  const selectionRect = container.querySelector('rect');
  expect(selectionRect?.getAttribute('x')).toBe('135');
  expect(selectionRect?.getAttribute('y')).toBe('205');
  expect(selectionRect?.getAttribute('width')).toBe('30');
  expect(selectionRect?.getAttribute('height')).toBe('30');
});
