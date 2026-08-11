import { describe, expect, it } from 'vitest';

import {
  IDLE_ANNOTATION_INTERACTION,
  transitionAnnotationInteraction,
} from './annotation-interaction-machine';

describe('annotation interaction machine', () => {
  it('keeps one owner from pointer down through pointer end', () => {
    const pressed = transitionAnnotationInteraction(
      IDLE_ANNOTATION_INTERACTION,
      {
        type: 'begin',
        pointerId: 1,
        owner: 'vertebra',
        point: { x: 10, y: 20 },
      }
    ).state;
    const moved = transitionAnnotationInteraction(pressed, {
      type: 'move',
      pointerId: 1,
      point: { x: 20, y: 20 },
      primaryActionPressed: true,
      dragStartThreshold: 3,
    });
    expect(moved.state.phase).toBe('dragging');
    expect(moved.effects).toEqual([
      {
        type: 'route-move',
        owner: 'vertebra',
        point: { x: 20, y: 20 },
        dragStarted: true,
      },
    ]);
    expect(
      transitionAnnotationInteraction(moved.state, {
        type: 'end',
        pointerId: 1,
      }).effects
    ).toEqual([
      { type: 'route-end', owner: 'vertebra', didDrag: true },
    ]);
  });

  it('emits hover only while idle and ignores another pointer', () => {
    expect(
      transitionAnnotationInteraction(IDLE_ANNOTATION_INTERACTION, {
        type: 'move',
        pointerId: 2,
        point: { x: 4, y: 5 },
        primaryActionPressed: false,
        dragStartThreshold: 3,
      }).effects
    ).toEqual([{ type: 'hover', point: { x: 4, y: 5 } }]);
  });
});
