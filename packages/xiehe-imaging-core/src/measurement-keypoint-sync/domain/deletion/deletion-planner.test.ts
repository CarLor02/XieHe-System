import type { MeasurementData } from '../../../shared/domain/contracts';
import { describe, expect, test } from 'vitest';

import {
  getMeasurementRequiredKeypointIds,
  planKeypointDeletion,
  planMeasurementDeletion,
} from './index';

function measurement(
  id: string,
  type: string,
  extra: Partial<MeasurementData> = {}
): MeasurementData {
  return { id, type, value: '0', points: [], ...extra };
}

describe('annotation deletion planner', () => {
  test('deleting TS preserves shared sacral points while CSS remains', () => {
    const measurements = [measurement('ts', 'ts'), measurement('css', 'css')];

    expect(planMeasurementDeletion(measurements, 'ts', '正位X光片')).toEqual({
      measurementIdsToDelete: ['ts'],
      keypointIdsToDelete: ['C7-1', 'C7-2', 'C7-3', 'C7-4'],
    });
  });

  test('PI and PT are deleted as one group while SS preserves S1 points', () => {
    const measurements = [
      measurement('pi', 'pi'),
      measurement('pt', 'pt'),
      measurement('ss', 'ss'),
    ];

    expect(planMeasurementDeletion(measurements, 'pi', '侧位X光片')).toEqual({
      measurementIdsToDelete: ['pi', 'pt'],
      keypointIdsToDelete: ['CFH'],
    });
  });

  test('a remaining TPA also preserves CFH when PI and PT are deleted', () => {
    const measurements = [
      measurement('pi', 'pi'),
      measurement('pt', 'pt'),
      measurement('tpa', 'tpa'),
    ];

    expect(
      planMeasurementDeletion(measurements, 'pt', '侧位X光片')
        .keypointIdsToDelete
    ).toEqual([]);
  });

  test('bilateral PI and PT own FH centers while SS preserves S1 points', () => {
    const pelvicMetadata = {
      schemaVersion: 2 as const,
      femoralHeadMode: 'bilateral' as const,
    };
    const measurements = [
      measurement('pi', 'pi', { pelvicMetadata }),
      measurement('pt', 'pt', { pelvicMetadata }),
      measurement('ss', 'ss'),
    ];

    expect(planMeasurementDeletion(measurements, 'pi', '侧位X光片')).toEqual({
      measurementIdsToDelete: ['pi', 'pt'],
      keypointIdsToDelete: ['FH-1', 'FH-2'],
    });
  });

  test('interconnected LL measurements only release points with no owner', () => {
    const firstState = [
      measurement('l1-s1', 'll-l1-s1'),
      measurement('l1-l4', 'll-l1-l4'),
      measurement('l4-s1', 'll-l4-s1'),
    ];
    expect(
      planMeasurementDeletion(firstState, 'l1-s1', '侧位X光片')
        .keypointIdsToDelete
    ).toEqual([]);

    const secondState = firstState.filter(item => item.id !== 'l1-s1');
    expect(
      planMeasurementDeletion(secondState, 'l1-l4', '侧位X光片')
        .keypointIdsToDelete
    ).toEqual(['L1-1', 'L1-2', 'L4-3', 'L4-4']);
  });

  test('deleting one keypoint removes every direct dependent and no other point', () => {
    const measurements = [
      measurement('ss', 'ss'),
      measurement('pi', 'pi'),
      measurement('ll', 'll-l1-s1'),
      measurement('t1', 't1-slope'),
    ];

    expect(
      planKeypointDeletion(measurements, ['S1-2'], '侧位X光片')
    ).toEqual({
      measurementIdsToDelete: ['ss', 'pi', 'll'],
      keypointIdsToDelete: ['S1-2'],
    });
  });

  test('bound lateral Cobb resolves its special endpoint rule exactly', () => {
    const cobb = measurement('cobb', 'lateral-cobb1', {
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      keypointSynced: true,
    });

    expect(getMeasurementRequiredKeypointIds(cobb, '侧位X光片')).toEqual([
      'C2-3',
      'C2-4',
      'C7-3',
      'C7-4',
    ]);
  });

  test('unbound Cobb with pending endpoints owns no keypoints', () => {
    expect(
      getMeasurementRequiredKeypointIds(
        measurement('cobb', 'Cobb1'),
        '正位X光片'
      )
    ).toEqual([]);
  });

  test('TTS owns sacral keypoints but not its interaction-only line points', () => {
    expect(
      getMeasurementRequiredKeypointIds(measurement('tts', 'tts'), '正位X光片')
    ).toEqual(['SL', 'SR']);
  });

  test('AVT resolves dynamic vertebra and reference dependencies from metadata', () => {
    const avt = measurement('avt', 'avt', {
      avtMetadata: {
        schemaVersion: 2,
        target: { type: 'vertebra', vertebra: 'T8' },
        referenceLine: 'c7pl',
      },
    });

    expect(getMeasurementRequiredKeypointIds(avt, '正位X光片')).toEqual([
      'T8-1',
      'T8-2',
      'T8-3',
      'T8-4',
      'C7-1',
      'C7-2',
      'C7-3',
      'C7-4',
    ]);
  });
});
