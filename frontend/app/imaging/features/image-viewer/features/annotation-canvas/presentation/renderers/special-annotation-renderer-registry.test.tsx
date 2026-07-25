import { describe, expect, it } from '@jest/globals';

import {
  renderSpecialAnnotationElements,
  SPECIAL_ANNOTATION_RENDERERS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/special-annotation-renderer-registry';

const request = {
  screenPoints: [
    { x: 10, y: 10 },
    { x: 30, y: 10 },
    { x: 10, y: 40 },
    { x: 30, y: 40 },
  ],
  displayColor: '#ffffff',
  imageScale: 1,
};

describe('special annotation renderer registry', () => {
  it('registers every renderer contract declared by the measurement catalog', () => {
    expect(Object.keys(SPECIAL_ANNOTATION_RENDERERS).sort()).toEqual([
      'c7-offset',
      'hemipelvic-width-ratio',
      'horizontal-lines',
      'pi',
      'pt',
      'sacral-with-perpendicular',
      'single-horizontal-line',
      'single-line-with-horizontal',
      'single-vertical-line',
      'ss',
      'sva',
      't1-slope',
      't1-tilt',
      'tpa',
      'tts',
      'two-lines',
    ]);
  });

  it('uses the inherited Cobb renderer for numbered Cobb measurements', () => {
    expect(renderSpecialAnnotationElements('Cobb12', request)).not.toBeNull();
    expect(
      renderSpecialAnnotationElements('lateral-cobb7', request)
    ).not.toBeNull();
  });

  it('returns null when a catalog entry has no special renderer', () => {
    expect(renderSpecialAnnotationElements('circle', request)).toBeNull();
  });
});
