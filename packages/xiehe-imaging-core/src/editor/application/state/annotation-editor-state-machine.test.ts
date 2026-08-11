import { describe, expect, it } from 'vitest';

import { createEmptyBindings } from '../../../bindings/domain';
import type { AnnotationEditorSnapshot } from '../../domain';
import { reduceAnnotationEditor } from './annotation-editor-state-machine';

const state: AnnotationEditorSnapshot = {
  measurements: [
    { id: 'm1', type: 'length', value: '1mm', points: [{ x: 1, y: 2 }] },
  ],
  standardDistance: 100,
  standardDistanceValue: '100',
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ],
  pointBindings: createEmptyBindings(),
  keypoints: [],
  vertebraeLayer: [],
  cfhAnnotation: null,
  aiMeasurementIds: ['m1'],
};

describe('reduceAnnotationEditor', () => {
  it('clears annotation facts while preserving calibration', () => {
    const result = reduceAnnotationEditor(state, { type: 'clear-annotations' });
    expect(result.state.measurements).toEqual([]);
    expect(result.state.standardDistance).toBe(100);
    expect(result.effects).toContainEqual({
      type: 'clear-transient-interaction',
    });
  });

  it('clones a restored history state', () => {
    const result = reduceAnnotationEditor(state, {
      type: 'replace-state',
      state,
      reason: 'history-restore',
    });
    expect(result.state).not.toBe(state);
    expect(result.state.measurements).not.toBe(state.measurements);
  });
});
