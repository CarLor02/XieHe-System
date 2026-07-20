import { describe, expect, it } from '@jest/globals';

import {
  getManualTtsTrunkCenter,
  getManualTtsTrunkPoints,
  isManualTtsMeasurement,
  moveManualTtsTrunkLineVertically,
} from './tts-interaction';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

const manualTts: MeasurementData = {
  id: 'manual-tts',
  type: 'tts',
  value: '-9.00mm',
  points: [
    { x: 10, y: 20 },
    { x: 30, y: 20 },
    { x: 40, y: 100 },
    { x: 60, y: 100 },
  ],
};

describe('manual TTS interaction rules', () => {
  it('identifies manual TTS and exposes its trunk line geometry', () => {
    expect(isManualTtsMeasurement(manualTts)).toBe(true);
    expect(getManualTtsTrunkPoints(manualTts)).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 20 },
    ]);
    expect(getManualTtsTrunkCenter(manualTts)).toEqual({ x: 20, y: 20 });
  });

  it('keeps a keypoint-synced manual TTS directly editable', () => {
    expect(
      isManualTtsMeasurement({
        ...manualTts,
        keypointSynced: true,
      })
    ).toBe(true);
  });

  it('moves only the trunk line vertically', () => {
    expect(moveManualTtsTrunkLineVertically(manualTts, 15)).toEqual([
      { x: 10, y: 35 },
      { x: 30, y: 35 },
      { x: 40, y: 100 },
      { x: 60, y: 100 },
    ]);
  });

  it('keeps legacy keypoint-derived TTS outside manual line interaction', () => {
    const derivedTts: MeasurementData = {
      ...manualTts,
      id: 'ap-keypoint-tts',
      upperVertebra: 'T5',
      lowerVertebra: 'T12',
      keypointSynced: true,
    };

    expect(isManualTtsMeasurement(derivedTts)).toBe(false);
    expect(getManualTtsTrunkPoints(derivedTts)).toBeNull();
    expect(moveManualTtsTrunkLineVertically(derivedTts, 15)).toBe(
      derivedTts.points
    );
  });
});
