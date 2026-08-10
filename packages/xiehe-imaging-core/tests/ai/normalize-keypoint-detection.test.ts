import { describe, expect, it } from 'vitest';

import { normalizeAiKeypointDetection } from '../../src/ai';
import { AnnotationSource } from '../../src/shared/domain/contracts';

describe('normalizeAiKeypointDetection', () => {
  it('scales and geometrically orders lateral vertebrae while deduplicating labels', () => {
    const result = normalizeAiKeypointDetection(
      {
        image_width: 1000,
        image_height: 2000,
        vertebrae: [
          {
            label: 'T3',
            confidence: 0.2,
            keypoints: [
              { x: 0.6, y: 0.2 },
              { x: 0.4, y: 0.2 },
              { x: 0.6, y: 0.3 },
              { x: 0.4, y: 0.3 },
            ],
          },
          {
            label: 'T3',
            confidence: 0.9,
            keypoints: [
              { x: 0.6, y: 0.3 },
              { x: 0.4, y: 0.2 },
              { x: 0.4, y: 0.3 },
              { x: 0.6, y: 0.2 },
            ],
          },
        ],
      },
      '侧位X光片'
    );

    expect(result.vertebrae).toEqual([
      {
        label: 'T3',
        confidence: 0.9,
        source: AnnotationSource.AI,
        corners: [
          { x: 400, y: 400 },
          { x: 600, y: 400 },
          { x: 400, y: 600 },
          { x: 600, y: 600 },
        ],
      },
    ]);
    expect(result.pointCount).toBe(4);
  });

  it('keeps S1 as two keypoints and returns CFH separately', () => {
    const result = normalizeAiKeypointDetection(
      {
        image_width: 100,
        image_height: 100,
        vertebrae: [
          {
            label: 'S1',
            confidence: 0.8,
            keypoints: [
              { x: 0.8, y: 0.7 },
              { x: 0.2, y: 0.6 },
            ],
          },
        ],
        cfh: { center: { x: 0.5, y: 0.9 }, confidence: 0.7 },
      },
      '侧位X光片'
    );

    expect(result.vertebrae.map(item => item.label)).toEqual(['S1-1', 'S1-2']);
    expect(result.vertebrae[0].corners[0]).toEqual({ x: 20, y: 60 });
    expect(result.cfh?.center).toEqual({ x: 50, y: 90 });
    expect(result.pointCount).toBe(3);
  });

  it('swaps the historical AP pose labels at the AI boundary', () => {
    const result = normalizeAiKeypointDetection(
      {
        pose_keypoints: {
          CR: { x: 10, y: 20, confidence: { parsedValue: 0.75 } },
          SL: { x: 30, y: 40 },
        },
      },
      '正位X光片'
    );

    expect(result.vertebrae.map(item => item.label)).toEqual(['CL', 'SR']);
    expect(result.vertebrae[0].confidence).toBe(0.75);
  });
});
