import { render, screen } from '@testing-library/react';
import { expect, it } from '@jest/globals';

import VertebraeLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/layers/VertebraeLayer';
import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';
import type {
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

it('renders corner labels instead of the vertebra label for a complete vertebra', () => {
  const vertebraeLayer: VertebraAnnotation[] = [
    {
      label: 'T1',
      corners: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 10, y: 30 },
        { x: 20, y: 30 },
      ],
      confidence: 1,
      source: AnnotationSource.AI,
    },
  ];
  const imageToScreen = (point: Point) => point;

  render(
    <svg>
      <VertebraeLayer
        vertebraeLayer={vertebraeLayer}
        cfhAnnotation={null}
        imageToScreen={imageToScreen}
      />
    </svg>
  );

  expect(screen.getByText('T1-1')).toBeTruthy();
  expect(screen.getByText('T1-2')).toBeTruthy();
  expect(screen.getByText('T1-3')).toBeTruthy();
  expect(screen.getByText('T1-4')).toBeTruthy();
  expect(screen.queryByText('T1')).toBeNull();
});
