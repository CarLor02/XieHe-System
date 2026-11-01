import { expect, it } from 'vitest';
import { createNextBoundCobbMeasurement } from '../../index';
import { AnnotationSource } from '../../../shared/domain/contracts';

it.each(['正位X光片', '侧位X光片'])(
  '%s 偏移后的旧端椎 ID 仍被占用时，新派生测量保持独立身份',
  examType => {
    const input = {
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      examType,
      keypoints: ['T1-1', 'T1-2', 'T3-3', 'T3-4'].map((id, index) => ({
        id,
        point: { x: 100 + index * 20, y: 100 + index * 30 },
        source: AnnotationSource.MANUAL,
        confidence: 1,
      })),
      calculationContext: {
        examType,
        standardDistance: null,
        standardDistancePoints: [],
        imageNaturalSize: null,
      },
      calculator: {
        calculateType: () => '10°',
        calculateMeasurement: () => '10°',
      },
    };
    const first = createNextBoundCobbMeasurement({
      ...input,
      existingMeasurements: [],
    })!;
    const shifted = { ...first, upperVertebra: 'T2', lowerVertebra: 'T4' };
    const second = createNextBoundCobbMeasurement({
      ...input,
      existingMeasurements: [shifted],
    })!;
    expect(second.id).not.toBe(first.id);
    expect(second).toMatchObject({
      upperVertebra: 'T1',
      lowerVertebra: 'T3',
      keypointSynced: true,
    });
    const third = createNextBoundCobbMeasurement({
      ...input,
      existingMeasurements: [
        shifted,
        { ...second, upperVertebra: 'T3', lowerVertebra: 'T5' },
      ],
    })!;
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
    expect(shifted.id).toBe(first.id);
  }
);
