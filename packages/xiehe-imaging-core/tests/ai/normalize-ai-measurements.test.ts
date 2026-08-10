import { describe, expect, it } from 'vitest';

import { normalizeAiMeasurements } from '../../src/ai';

const tools = new Map([
  ['cobb', { id: 'cobb', category: 'measurement' as const, pointsNeeded: 4 }],
  [
    't1-tilt',
    { id: 't1-tilt', category: 'measurement' as const, pointsNeeded: 2 },
  ],
  ['sva', { id: 'sva', category: 'measurement' as const, pointsNeeded: 5 }],
]);

describe('normalizeAiMeasurements', () => {
  it('scales points, trims excess points, and assigns stable Cobb sequence', () => {
    const result = normalizeAiMeasurements({
      response: {
        imageWidth: 100,
        imageHeight: 200,
        measurements: [
          {
            type: 'Cobb-T1-T4',
            points: [
              { x: 10, y: 20 },
              { x: 20, y: 20 },
              { x: 30, y: 40 },
              { x: 40, y: 40 },
              { x: 99, y: 99 },
            ],
            upper_vertebra: 'T1',
            lower_vertebra: 'T4',
          },
        ],
      },
      examType: '正位X光片',
      actualImageSize: { width: 200, height: 400 },
      resolveTool: type =>
        type.startsWith('Cobb-') ? (tools.get('cobb') ?? null) : null,
      calculateValue: (_type, points) => `${points[0].x}`,
      describeType: type => type,
      createId: (_measurement, index) => `ai-${index}`,
    });

    expect(result.measurements[0]).toMatchObject({
      id: 'ai-0',
      type: 'cobb1',
      value: '20',
      upperVertebra: 'T1',
      lowerVertebra: 'T4',
    });
    expect(result.measurements[0].points).toHaveLength(4);
    expect(result.scale).toEqual({ x: 2, y: 2 });
  });

  it('keeps only Cobb measurements for bending exams', () => {
    const result = normalizeAiMeasurements({
      response: {
        measurements: [
          { type: 'Cobb-T1-T4', points: Array(4).fill({ x: 1, y: 1 }) },
          { type: 't1-tilt', points: Array(2).fill({ x: 1, y: 1 }) },
        ],
      },
      examType: '左侧曲位',
      actualImageSize: null,
      resolveTool: type =>
        type.startsWith('Cobb-')
          ? (tools.get('cobb') ?? null)
          : (tools.get(type) ?? null),
      calculateValue: () => '1°',
      describeType: type => type,
      createId: (_measurement, index) => `ai-${index}`,
    });

    expect(result.measurements.map(item => item.type)).toEqual(['cobb1']);
  });
});
