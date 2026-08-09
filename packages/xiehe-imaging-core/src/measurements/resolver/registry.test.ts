import { describe, expect, it } from 'vitest';

import type { MeasurementData, Point } from '../../contracts';

import {
  resolveCobbEndpointPointIds,
  resolveVariableMeasurement,
} from './registry';

const FOUR_POINTS: Point[] = [
  { x: 10, y: 10 },
  { x: 20, y: 10 },
  { x: 10, y: 30 },
  { x: 20, y: 30 },
];

function measurement(
  type: string,
  overrides: Partial<MeasurementData> = {}
): MeasurementData {
  return {
    id: `measurement-${type}`,
    type,
    value: '10.00°',
    points: FOUR_POINTS,
    ...overrides,
  };
}

describe('variable measurement resolver registry', () => {
  it('uses exam type to separate AP and historical lateral CobbN records', () => {
    const cobb = measurement('cobb3', {
      upperVertebra: 'T3',
      lowerVertebra: 'T8',
    });

    const ap = resolveVariableMeasurement(cobb, { examType: '正位X光片' });
    const lateral = resolveVariableMeasurement(cobb, {
      examType: '侧位X光片',
    });

    expect(ap.status).toBe('resolved');
    expect(lateral.status).toBe('resolved');
    if (ap.status !== 'resolved' || lateral.status !== 'resolved') return;
    expect(ap.value).toMatchObject({ kind: 'cobb', examView: 'ap' });
    expect(lateral.value).toMatchObject({
      kind: 'cobb',
      examView: 'lateral',
      layout: 'lateral-generic',
    });
  });

  it('gives every named lateral Cobb its exact resolver before generic rules', () => {
    const named = resolveVariableMeasurement(
      measurement('lateral-cobb2', {
        upperVertebra: 'T5',
        lowerVertebra: 'T12',
      }),
      { examType: '侧位X光片' }
    );

    expect(named.status).toBe('resolved');
    if (named.status !== 'resolved') return;
    expect(named.value).toMatchObject({
      kind: 'cobb',
      layout: 'lateral-named',
      displayName: 'TK T5-T12',
      endpointPointIds: ['T5-1', 'T5-2', 'T12-3', 'T12-4'],
    });
  });

  it('uses the S1 upper-endplate resolver for non-named lateral Cobb', () => {
    expect(
      resolveCobbEndpointPointIds(
        {
          type: 'lateral-cobb4',
          upperVertebra: 'L2',
          lowerVertebra: 'S1',
        },
        { examType: '侧位X光片' }
      )
    ).toEqual(['L2-1', 'L2-2', 'S1-1', 'S1-2']);
  });

  it('marks recognized malformed measurements invalid without treating fixed tools as invalid', () => {
    expect(
      resolveVariableMeasurement(
        measurement('cobb1', { points: FOUR_POINTS.slice(0, 3) }),
        { examType: '正位X光片' }
      ).status
    ).toBe('invalid');
    expect(
      resolveVariableMeasurement(measurement('T1 Tilt'), {
        examType: '正位X光片',
      }).status
    ).toBe('not-applicable');
  });

  it('resolves AVT and manual TTS through the same registry', () => {
    const avt = resolveVariableMeasurement(
      measurement('AVT', {
        apexVertebra: 'T8',
        points: [FOUR_POINTS[0], FOUR_POINTS[1]],
      }),
      { examType: '正位X光片' }
    );
    const tts = resolveVariableMeasurement(measurement('TTS'), {
      examType: '正位X光片',
    });

    expect(avt.status === 'resolved' && avt.value.kind).toBe('avt');
    expect(
      tts.status === 'resolved' && tts.value.kind === 'tts'
        ? tts.value.layout
        : null
    ).toBe('manual');
  });

  it('preserves the historical seven-point bilateral TPA contract', () => {
    const result = resolveVariableMeasurement(
      measurement('TPA', {
        points: [
          ...FOUR_POINTS,
          { x: 100, y: 100 },
          { x: 80, y: 200 },
          { x: 120, y: 200 },
        ],
        pelvicMetadata: {
          schemaVersion: 2,
          femoralHeadMode: 'bilateral',
        },
      }),
      { examType: '侧位X光片' }
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved' || result.value.kind !== 'pelvic') return;
    expect(result.value).toMatchObject({
      toolId: 'tpa',
      mode: 'bilateral',
      layout: 'legacy-bilateral-effective-cfh',
      isLegacy: true,
      femoralCenterPointIndices: null,
    });
  });
});
