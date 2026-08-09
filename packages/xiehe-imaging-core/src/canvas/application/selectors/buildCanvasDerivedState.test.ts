import { describe, expect, it } from 'vitest';

import { buildCanvasDerivedState } from './buildCanvasDerivedState';

describe('buildCanvasDerivedState', () => {
  it('keeps the full platform tool while deriving platform-neutral canvas state', () => {
    const result = buildCanvasDerivedState({
      selectedTool: 'custom',
      tools: [
        {
          id: 'custom',
          pointsNeeded: 4,
          presentationName: 'Custom tool',
        },
      ],
      measurements: [
        { id: 'first', type: 'custom', value: '', points: [] },
        { id: 'hovered', type: 'custom', value: '', points: [] },
      ],
      keypoints: [],
      hideAllAnnotations: false,
      hiddenAnnotationIds: new Set(),
      hoverState: {
        measurementId: 'hovered',
        keypointId: null,
        pointIndex: null,
        elementType: 'whole',
      },
    });

    expect(result.currentTool?.presentationName).toBe('Custom tool');
    expect(result.pointsNeeded).toBe(4);
    expect(result.orderedVisibleMeasurements.map(item => item.id)).toEqual([
      'first',
      'hovered',
    ]);
  });

  it('hides annotations and exposes hover state for the working point', () => {
    const result = buildCanvasDerivedState({
      selectedTool: '',
      tools: [],
      measurements: [{ id: 'hidden', type: 'custom', value: '', points: [] }],
      keypoints: [],
      hideAllAnnotations: true,
      hiddenAnnotationIds: new Set(),
      hoverState: {
        measurementId: null,
        keypointId: null,
        pointIndex: 2,
        elementType: 'point',
      },
    });

    expect(result.visibleMeasurements).toEqual([]);
    expect(result.workingPointHoverIndex).toBe(2);
  });
});
