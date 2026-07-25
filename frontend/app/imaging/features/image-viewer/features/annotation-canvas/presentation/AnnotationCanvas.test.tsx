import { expect, it } from '@jest/globals';

import {
  getAnnotationCanvasCursorClass,
  getDetectionSelectionKeypointIds,
} from './AnnotationCanvas';
import {
  AnnotationSource,
  type KeypointSequenceSession,
  type VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

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

it('maps a selected vertebra to its rendered keypoint ids', () => {
  const layer: VertebraAnnotation[] = [
    {
      label: 'T1',
      corners: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      confidence: 1,
      source: AnnotationSource.AI,
    },
  ];

  expect(
    getDetectionSelectionKeypointIds(
      { kind: 'vertebra', vertebraLabel: 'T1' },
      layer
    )
  ).toEqual(['T1-1', 'T1-2', 'T1-3', 'T1-4']);
});

it('drops a selected keypoint when it is no longer rendered', () => {
  expect(
    getDetectionSelectionKeypointIds(
      { kind: 'keypoint', keypointId: 'T1-1' },
      []
    )
  ).toEqual([]);
});
