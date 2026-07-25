import { render } from '@testing-library/react';
import { expect, it } from '@jest/globals';

import { renderAvtMeasurement } from './renderAvtMeasurement';

it('renders a manual disc line, CSVL and horizontal AVT measurement line', () => {
  const measurement = {
    id: 'ap-keypoint-avt-disc-t12-l1',
    type: 'avt',
    value: '-100.00mm',
    points: [
      { x: 80, y: 100 },
      { x: 120, y: 100 },
      { x: 180, y: 300 },
      { x: 220, y: 300 },
    ],
    avtMetadata: {
      schemaVersion: 2 as const,
      target: {
        type: 'disc' as const,
        upperVertebra: 'T12',
        lowerVertebra: 'L1',
      },
      referenceLine: 'csvl' as const,
    },
  };

  const { container } = render(
    <svg>
      {renderAvtMeasurement({
        measurement,
        displayColor: '#059669',
        imageToScreen: point => point,
      })}
    </svg>
  );

  expect(container.querySelectorAll('line')).toHaveLength(4);
  expect(container.querySelectorAll('circle')).toHaveLength(2);
  expect(container.querySelectorAll('polygon')).toHaveLength(0);
});

it('renders both target vertebra and C7 reference outlines for C7PL', () => {
  const measurement = {
    id: 'ap-keypoint-avt-t4',
    type: 'avt',
    value: '-10.00mm',
    points: [
      { x: 80, y: 100 },
      { x: 120, y: 100 },
      { x: 80, y: 130 },
      { x: 120, y: 130 },
      { x: 180, y: 20 },
      { x: 220, y: 20 },
      { x: 180, y: 50 },
      { x: 220, y: 50 },
    ],
    apexVertebra: 'T4',
    avtMetadata: {
      schemaVersion: 2 as const,
      target: {
        type: 'vertebra' as const,
        vertebra: 'T4',
      },
      referenceLine: 'c7pl' as const,
    },
  };

  const { container } = render(
    <svg>
      {renderAvtMeasurement({
        measurement,
        displayColor: '#059669',
        imageToScreen: point => point,
      })}
    </svg>
  );

  expect(container.querySelectorAll('polygon')).toHaveLength(2);
  expect(container.querySelectorAll('line')).toHaveLength(2);
  expect(container.querySelectorAll('circle')).toHaveLength(2);
});
