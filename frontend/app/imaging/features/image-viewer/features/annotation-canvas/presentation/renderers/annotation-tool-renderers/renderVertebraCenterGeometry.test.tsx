import { render } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';

import { renderVertebraCenterGeometry } from './renderVertebraCenterGeometry';

describe('renderVertebraCenterGeometry', () => {
  it('renders the perimeter, both edge-midpoint lines and one center point', () => {
    const { container } = render(
      <svg>
        {renderVertebraCenterGeometry({
          corners: [
            { x: 0, y: 0 },
            { x: 8, y: 2 },
            { x: 2, y: 10 },
            { x: 14, y: 8 },
          ],
          displayColor: '#10b981',
        })}
      </svg>
    );

    const perimeter = container.querySelectorAll(
      '[data-vertebra-geometry-part="perimeter"]'
    );
    const midlines = container.querySelectorAll(
      '[data-vertebra-geometry-part="midline"]'
    );
    const center = container.querySelector(
      '[data-vertebra-geometry-part="center"]'
    );

    expect(perimeter).toHaveLength(4);
    expect(midlines).toHaveLength(2);
    expect(center).not.toBeNull();
    expect(container.querySelectorAll('text')).toHaveLength(0);

    expect(perimeter[1].getAttribute('x1')).toBe('8');
    expect(perimeter[1].getAttribute('y1')).toBe('2');
    expect(perimeter[1].getAttribute('x2')).toBe('14');
    expect(perimeter[1].getAttribute('y2')).toBe('8');
    expect(midlines[0].getAttribute('x1')).toBe('4');
    expect(midlines[0].getAttribute('y1')).toBe('1');
    expect(midlines[0].getAttribute('x2')).toBe('8');
    expect(midlines[0].getAttribute('y2')).toBe('9');
    expect(center?.getAttribute('cx')).toBe('6');
    expect(center?.getAttribute('cy')).toBe('5');
  });
});
