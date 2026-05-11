import { render, screen } from '@testing-library/react';
import { expect, it } from '@jest/globals';

import ImageLayer from './ImageLayer';

it('fills the annotation viewport using the same object-contain model as coordinate transforms', () => {
  render(
    <ImageLayer
      imageUrl="/image.png"
      imagePosition={{ x: 0, y: 0 }}
      imageScale={1}
      brightness={0}
      contrast={0}
    />
  );

  const image = screen.getByRole('img', { name: '影像' });

  expect(image.className).toContain('w-full');
  expect(image.className).toContain('h-full');
  expect(image.className).toContain('object-contain');
});
