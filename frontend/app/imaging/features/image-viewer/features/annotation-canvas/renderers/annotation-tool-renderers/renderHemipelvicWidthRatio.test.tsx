import { render, screen } from '@testing-library/react';
import { expect, it } from '@jest/globals';

import { renderHemipelvicWidthRatio } from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/renderHemipelvicWidthRatio';
import { createHemipelvicWidthRatioPoints } from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

it('renders sorted anatomical labels and calibrated dL/dR values', () => {
  const points = createHemipelvicWidthRatioPoints([
    { x: 50, y: 20 },
    { x: 0, y: 20 },
    { x: 60, y: 20 },
    { x: 20, y: 20 },
  ]);

  render(
    <svg>
      {renderHemipelvicWidthRatio(points, '#06b6d4', 1, {
        imagePoints: points,
        screenPoints: points,
        imageToScreen: point => point,
        calculationContext: {
          standardDistance: 100,
          standardDistancePoints: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          imageNaturalSize: { width: 1000, height: 1000 },
        },
      })}
    </svg>
  );

  expect(screen.getByText('左外缘（ASIS）')).toBeTruthy();
  expect(screen.getByText('左内缘（SI）')).toBeTruthy();
  expect(screen.getByText('右内缘（SI）')).toBeTruthy();
  expect(screen.getByText('右外缘（ASIS）')).toBeTruthy();
  expect(screen.getByText('dL: 20.00mm')).toBeTruthy();
  expect(screen.getByText('dR: 10.00mm')).toBeTruthy();
});
