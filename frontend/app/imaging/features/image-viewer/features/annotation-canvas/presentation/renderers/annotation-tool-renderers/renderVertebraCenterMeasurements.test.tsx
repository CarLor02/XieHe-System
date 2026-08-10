import { render } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';

import { renderC7Offset } from './renderC7Offset';
import { renderSVA } from './renderSVA';
import { renderTPA } from './renderTPA';

const corners = [
  { x: 0, y: 0 },
  { x: 8, y: 2 },
  { x: 2, y: 10 },
  { x: 14, y: 8 },
];

function expectSingleVertebraGeometry(container: HTMLElement) {
  expect(
    container.querySelectorAll('[data-vertebra-center-geometry="true"]')
  ).toHaveLength(1);
  expect(
    container.querySelectorAll('[data-vertebra-geometry-part="perimeter"]')
  ).toHaveLength(4);
  expect(
    container.querySelectorAll('[data-vertebra-geometry-part="midline"]')
  ).toHaveLength(2);
  expect(
    container.querySelectorAll('[data-vertebra-geometry-part="center"]')
  ).toHaveLength(1);
}

describe('vertebra-center measurement renderers', () => {
  it('renders TS with C7 perimeter and midpoint cross lines', () => {
    const { container } = render(
      <svg>
        {renderC7Offset(
          [...corners, { x: 20, y: 20 }, { x: 30, y: 20 }],
          '#06b6d4',
          1
        )}
      </svg>
    );

    expectSingleVertebraGeometry(container);
  });

  it('renders SVA with C7 perimeter and midpoint cross lines', () => {
    const { container } = render(
      <svg>
        {renderSVA([...corners, { x: 20, y: 20 }], '#06b6d4', 1)}
      </svg>
    );

    expectSingleVertebraGeometry(container);
  });

  it('renders TPA with T1 perimeter and midpoint cross lines', () => {
    const { container } = render(
      <svg>
        {renderTPA(
          [
            ...corners,
            { x: 0, y: 20 },
            { x: 20, y: 30 },
            { x: 30, y: 30 },
          ],
          '#06b6d4',
          1
        )}
      </svg>
    );

    expectSingleVertebraGeometry(container);
  });
});
