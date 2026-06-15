import { expect, it } from '@jest/globals';

import { getAnnotationCanvasCursorClass } from './AnnotationCanvas';
import type { KeypointSequenceSession } from '@/app/imaging/features/image-viewer/shared/types';

it('uses a crosshair cursor during sequential keypoint placement', () => {
  const keypointSequenceSession: KeypointSequenceSession = {
    groupName: 'L5',
    keypointIds: ['L5-1', 'L5-2', 'L5-3', 'L5-4'],
    currentIndex: 0,
  };

  expect(
    getAnnotationCanvasCursorClass({
      keypointSequenceSession,
      showVertebraeLayer: false,
      isVertebradDragging: false,
      selectedTool: 'hand',
      hasActiveOrHoveredCorner: false,
      fallbackCursorClass: 'cursor-grab',
    })
  ).toBe('cursor-crosshair');
});
